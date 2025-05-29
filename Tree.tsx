import React, { useEffect, useState } from "react";
import "./Tree.css";

export interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

interface TreeProps {
  data: TreeNode[];
  onNodeClick: (node: TreeNode) => void;
}

const STORAGE_KEY = "tree-data";
const Tree: React.FC<TreeProps> = ({ data, onNodeClick }) => {
  const [tree, setTree] = useState<TreeNode[]>(() => {
    const storedTree = localStorage.getItem(STORAGE_KEY);
    if (storedTree) {
      try {
        const parsed = JSON.parse(storedTree);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        console.warn("Ошибка парсинга localStorage");
      }
    }
    return data.length > 0 ? data : []; // fallback
  });

  // Сохраняем изменения дерева в localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
  }, [tree]);

  const handleAddRoot = () => {
    const name = prompt("Введите имя корневого узла:");
    if (!name) return;
    const newNode: TreeNode = {
      id: Date.now().toString(),
      name,
      children: [],
    };
    setTree([...tree, newNode]);
  };

  const handleAdd = (parentId: string) => {
    const name = prompt("Введите имя нового узла:");
    if (!name) return;
    const newNode: TreeNode = {
      id: Date.now().toString(),
      name,
      children: [],
    };
    setTree(addNode(tree, parentId, newNode));
  };

  const handleEdit = (node: TreeNode) => {
    const name = prompt("Новое имя узла:", node.name);
    if (!name) return;
    setTree(editNode(tree, node.id, name));
  };

  const handleDelete = (nodeId: string) => {
    if (!window.confirm("Удалить узел и всех потомков?")) return;
    setTree(deleteNode(tree, nodeId));
  };

  const handleReset = () => {
    if (window.confirm("Сбросить дерево до исходного состояния?")) {
      setTree(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  };

  const handleExport = () => {
    const json = JSON.stringify(tree, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "tree-data.json";
    a.click();

    URL.revokeObjectURL(url);
  };

  function addNode(
    nodes: TreeNode[],
    parentId: string,
    newNode: TreeNode
  ): TreeNode[] {
    return nodes.map((node) => {
      if (node.id === parentId) {
        return {
          ...node,
          children: node.children ? [...node.children, newNode] : [newNode],
        };
      }
      if (node.children) {
        return { ...node, children: addNode(node.children, parentId, newNode) };
      }
      return node;
    });
  }

  function editNode(
    nodes: TreeNode[],
    nodeId: string,
    name: string
  ): TreeNode[] {
    return nodes.map((node) => {
      if (node.id === nodeId) {
        return { ...node, name };
      }
      if (node.children) {
        return { ...node, children: editNode(node.children, nodeId, name) };
      }
      return node;
    });
  }

  function deleteNode(nodes: TreeNode[], nodeId: string): TreeNode[] {
    return nodes
      .filter((node) => node.id !== nodeId)
      .map((node) =>
        node.children
          ? { ...node, children: deleteNode(node.children, nodeId) }
          : node
      );
  }

  const renderTree = (nodes: TreeNode[]) => (
    <ul className="tree">
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="tree-line" />
          <span className="node-label" onClick={() => onNodeClick(node)}>
            {node.name}
          </span>
          <span className="node-buttons">
            <button onClick={() => handleAdd(node.id)}>Add</button>
            <button onClick={() => handleEdit(node)}>Edit</button>
            <button onClick={() => handleDelete(node.id)}>Delete</button>
          </span>
          {node.children &&
            node.children.length > 0 &&
            renderTree(node.children)}
        </li>
      ))}
    </ul>
  );

  return (
    <div>
      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}>
        <span className="node-buttons">
          <button onClick={handleAddRoot}>Add root</button>
          <button onClick={handleReset}>Reset</button>
          <button onClick={handleExport}>Export JSON</button>
        </span>
      </div>

      {tree.length === 0 ? (
        <p>Дерево пусто. Добавьте первый узел.</p>
      ) : (
        renderTree(tree)
      )}
    </div>
  );
};

export default Tree;
