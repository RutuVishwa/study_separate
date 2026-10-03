# AI Study Material Organizer

I noticed that the study material shared in WhatsApp groups can quickly become a **mess when you actually need to find something**. PDFs, notes, source-code files, and other resources get buried among hundreds of messages, making it difficult to find the right material when studying for exams or completing assignments.

Hence, I created a platform where the user simply **uploads a file**, and the system automatically analyzes it and **segregates it into the appropriate subject folder** using AI.

For example, if a user uploads a C++ program related to inheritance, the system identifies it as **OOP** material and places it in the OOP section. The current MVP focuses on organizing material **subject-wise**, with topic-wise organization planned as a future extension.

## The Constraint

One of the constraints for this project was to **not use a mouse**.

Because of this, I designed the application around a **terminal-based UI and keyboard-driven input**, allowing the user to navigate and interact with the system without relying on a mouse.

The idea is simple:

**Upload → AI analyzes → Subject identified → Material organized**
