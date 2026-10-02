class Node:
    def __init__(self, key):
        self.left = None
        self.right = None
        self.val = key

# Binary Search Tree (BST) In-Order Traversal Implementation
def inorder_traversal(root):
    if root:
        inorder_traversal(root.left)
        print(root.val, end=" ")
        inorder_traversal(root.right)

# Time Complexity: O(N), Space Complexity: O(H) for recursion stack
root = Node(50)
root.left = Node(30)
root.right = Node(70)
inorder_traversal(root)
