import React, { useState, useEffect, useRef } from 'react';
import { fetchDashboardStats, fetchMaterials, uploadMaterial, confirmUpload, deleteMaterial, getDownloadUrl } from '../services/api';

const TerminalApp = () => {
  const [history, setHistory] = useState([
    { type: 'output', content: '=======================================================' },
    { type: 'output', content: '         AI STUDY MATERIAL ORGANIZER TERMINAL          ' },
    { type: 'output', content: '=======================================================' },
    { type: 'output', content: 'Initializing system...' }
  ]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('INIT');
  const [context, setContext] = useState({});
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  useEffect(() => {
    // Keep focus on input
    const focusInput = () => {
      if (inputRef.current) inputRef.current.focus();
    };
    document.addEventListener('click', focusInput);
    focusInput();
    return () => document.removeEventListener('click', focusInput);
  }, []);

  const print = (text, type = 'output') => {
    setHistory(prev => [...prev, { type, content: text }]);
  };

  const showMainMenu = () => {
    print('-------------------------------------------------------');
    print('MAIN MENU');
    print('1. View Dashboard Stats');
    print('2. View Materials by Subject');
    print('3. Upload Material');
    print('4. Clear Terminal');
    print('Enter your choice (1-4):');
    setMode('MAIN_MENU');
  };

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (mode === 'INIT' && !hasInitialized.current) {
      hasInitialized.current = true;
      setTimeout(() => {
        print('System initialized successfully. Backend connected.');
        showMainMenu();
      }, 500);
    }
  }, [mode]);

  const handleCommand = async (e) => {
    if (e.key === 'Enter') {
      const cmd = input.trim();
      print(`> ${cmd}`, 'input');
      setInput('');
      await processCommand(cmd);
    }
  };

  const processCommand = async (cmd) => {
    if (cmd.toLowerCase() === 'clear' || cmd === '4') {
      setHistory([]);
      showMainMenu();
      return;
    }

    if (mode === 'MAIN_MENU') {
      switch (cmd) {
        case '1':
          await handleViewStats();
          break;
        case '2':
          showSubjectsMenu();
          break;
        case '3':
          triggerFileUpload();
          break;
        default:
          print('Invalid choice. Please enter 1-4.');
      }
    } else if (mode === 'SELECT_SUBJECT') {
      const subjects = ['Discrete Mathematics', 'DSA', 'OOP', 'DBMS', 'LDM', 'ALL'];
      const idx = parseInt(cmd, 10) - 1;
      if (idx >= 0 && idx < subjects.length) {
        await handleViewMaterials(subjects[idx]);
      } else if (cmd.toLowerCase() === 'b') {
        showMainMenu();
      } else {
        print('Invalid choice. Enter a number (1-6) or "b" to go back.');
      }
    } else if (mode === 'VIEW_MATERIALS') {
      if (cmd.toLowerCase() === 'b') {
        showSubjectsMenu();
      } else if (cmd.toLowerCase().startsWith('d ')) {
        const idx = parseInt(cmd.split(' ')[1], 10) - 1;
        await handleDeleteMaterial(idx);
      } else if (cmd.toLowerCase().startsWith('o ')) {
        const idx = parseInt(cmd.split(' ')[1], 10) - 1;
        await handleOpenMaterial(idx);
      } else {
        print('Invalid command. Use "o <num>" to open, "d <num>" to delete, or "b" to go back.');
      }
    } else if (mode === 'CONFIRM_UPLOAD') {
      if (cmd.toLowerCase() === 'y' || cmd.toLowerCase() === 'n') {
        await handleConfirmUpload(cmd.toLowerCase() === 'y');
      } else {
        print('Invalid choice. Enter "y" to confirm or "n" to reject.');
      }
    }
  };

  const handleViewStats = async () => {
    print('Fetching stats...');
    try {
      const stats = await fetchDashboardStats();
      print(`Total Materials: ${stats.total_materials}`);
      print('Counts by Subject:');
      Object.entries(stats.subject_counts).forEach(([subj, count]) => {
        print(`  - ${subj}: ${count}`);
      });
    } catch (err) {
      print(`Error: ${err.message}`, 'error');
    }
    showMainMenu();
  };

  const showSubjectsMenu = () => {
    print('-------------------------------------------------------');
    print('SELECT SUBJECT');
    print('1. Discrete Mathematics');
    print('2. DSA');
    print('3. OOP');
    print('4. DBMS');
    print('5. LDM');
    print('6. ALL');
    print('b. Back to Main Menu');
    print('Enter choice:');
    setMode('SELECT_SUBJECT');
  };

  const handleViewMaterials = async (subject) => {
    print(`Fetching materials for ${subject}...`);
    try {
      const materials = await fetchMaterials(subject);
      if (materials.length === 0) {
        print(`No materials found for ${subject}.`);
      } else {
        print('-------------------------------------------------------');
        materials.forEach((m, idx) => {
          print(`[${idx + 1}] ${m.filename} (${m.subject})`);
        });
        print('-------------------------------------------------------');
        print('Commands: "o <num>" to open, "d <num>" to delete, "b" to go back');
      }
      setContext({ ...context, currentMaterials: materials });
      setMode('VIEW_MATERIALS');
    } catch (err) {
      print(`Error: ${err.message}`, 'error');
      showSubjectsMenu();
    }
  };

  const handleDeleteMaterial = async (idx) => {
    const materials = context.currentMaterials;
    if (!materials || idx < 0 || idx >= materials.length) {
      print('Invalid material number.');
      return;
    }
    const mat = materials[idx];
    print(`Deleting ${mat.filename}...`);
    try {
      await deleteMaterial(mat.id);
      print('Material deleted successfully.');
      // Refresh list
      await handleViewMaterials(mat.subject);
    } catch (err) {
      print(`Error: ${err.message}`, 'error');
    }
  };

  const [viewer, setViewer] = useState({ open: false, url: '', title: '' });

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape' && viewer.open) {
        setViewer({ open: false, url: '', title: '' });
        // Refocus terminal input after closing
        setTimeout(() => {
          if (inputRef.current) inputRef.current.focus();
        }, 100);
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [viewer.open]);

  const handleOpenMaterial = async (idx) => {
    const materials = context.currentMaterials;
    if (!materials || idx < 0 || idx >= materials.length) {
      print('Invalid material number.');
      return;
    }
    const mat = materials[idx];
    const url = getDownloadUrl(mat.id) + `?t=${Date.now()}`;
    print(`Opening ${mat.filename} in internal viewer...`);
    setViewer({ open: true, url, title: mat.filename });
  };

  const triggerFileUpload = () => {
    print('Please select a file from the file picker dialog...');
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const onFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      print('File selection cancelled.');
      showMainMenu();
      return;
    }

    print(`Uploading and analyzing ${file.name}... Please wait.`);
    // Reset input
    e.target.value = null;

    try {
      const data = await uploadMaterial(file);
      if (data.status === 'success') {
        print(`Upload successful. Classified as: ${data.data.subject}`);
        showMainMenu();
      } else if (data.status === 'needs_confirmation') {
        print(`AI classified this as: ${data.data.suggested_subject} (Confidence: ${(data.data.confidence * 100).toFixed(1)}%)`);
        print('Do you want to confirm this classification? (y/n)');
        setContext({ ...context, tempFileId: data.data.temp_file_id, suggestedSubject: data.data.suggested_subject });
        setMode('CONFIRM_UPLOAD');
      }
    } catch (err) {
      print(`Upload failed: ${err.message}`, 'error');
      showMainMenu();
    }
  };

  const handleConfirmUpload = async (confirmed) => {
    if (!confirmed) {
      print('Classification rejected. (Manual overriding not fully implemented in CLI yet, discarding).');
      showMainMenu();
      return;
    }
    print('Confirming upload...');
    try {
      const { tempFileId, suggestedSubject } = context;
      await confirmUpload(tempFileId, suggestedSubject);
      print('Material saved successfully.');
    } catch (err) {
      print(`Error confirming: ${err.message}`, 'error');
    }
    showMainMenu();
  };

  return (
    <>
      <div className="terminal-container">
        <div className="terminal-history">
          {history.map((line, idx) => (
            <div key={idx} className={`terminal-line type-${line.type}`}>
              {line.content}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="terminal-input-row">
          <span className="prompt">root@study-organizer:~$ </span>
          <input
            ref={inputRef}
            type="text"
            className="terminal-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleCommand}
            autoFocus
            autoComplete="off"
            spellCheck="false"
            disabled={viewer.open}
          />
        </div>
        
        {/* Hidden file input for uploading */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={onFileChange} 
        />
      </div>

      {viewer.open && (
        <div className="viewer-overlay">
          <div className="viewer-window">
            <div className="viewer-header">
              <span>{viewer.title}</span>
              <span className="viewer-hint">[Type 'q' or press ESC to close]</span>
            </div>
            <iframe 
              src={viewer.url} 
              className="viewer-iframe" 
              title="Content Viewer"
            />
            <div className="viewer-footer">
              <span className="prompt">viewer~$ </span>
              <input
                autoFocus
                type="text"
                className="terminal-input"
                placeholder="Type 'q' and enter to close"
                onChange={(e) => {
                  if (e.target.value.toLowerCase().includes('q')) {
                    setViewer({ open: false, url: '', title: '' });
                    setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 100);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setViewer({ open: false, url: '', title: '' });
                    setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 100);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TerminalApp;
