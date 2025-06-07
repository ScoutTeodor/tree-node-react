import React, { useEffect, useState, useCallback } from "react";
import { useDrag, useDrop } from "react-dnd";
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

const ITEM_TYPE = "TREE_NODE";

const API_URL = (window as any).API_URL || "http://localhost:4000";

const Tree: React.FC<TreeProps> = ({ data, onNodeClick }) => {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  // Загрузка с сервера при монтировании
  useEffect(() => {
    fetch(`${API_URL}/api/tree`)
      .then((res) => {
        if (!res.ok) throw new Error("Не удалось загрузить дерево");
        return res.json() as Promise<TreeNode[]>;
      })
      .then((serverData) => {
        if (Array.isArray(serverData) && serverData.length > 0) {
          setTree(serverData);
        } else {
          setTree(data);
        }
      })
      .catch(() => {
        // на случай ошибки — fallback на data из пропсов
        setTree(data);
      })
      .finally(() => setLoading(false));
  }, [data]);

  // Отправляем на сервер при любом изменении дерева
  useEffect(() => {
    if (loading) return;
    fetch(`${API_URL}/api/tree`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tree),
    }).catch((err) => {
      console.error("Ошибка сохранения дерева:", err);
    });
  }, [tree, loading]);

  // Проверка, является ли childId в поддереве nodeId
  const isDescendant = useCallback(
    (nodes: TreeNode[], nodeId: string, childId: string): boolean => {
      for (const node of nodes) {
        if (node.id === nodeId) {
          const stack: TreeNode[] = [node];
          while (stack.length) {
            const curr = stack.pop()!;
            if (curr.id === childId) return true;
            if (curr.children) stack.push(...curr.children);
          }
          return false;
        }
        if (node.children && isDescendant(node.children, nodeId, childId)) {
          return true;
        }
      }
      return false;
    },
    []
  );

  const handleAddRoot = () => {
    const name = prompt("Введите имя корневого узла:");
    if (!name) return;
    const newNode: TreeNode = { id: Date.now().toString(), name, children: [] };
    setTree((prev) => [...prev, newNode]);
  };
  const handleAdd = (parentId: string) => {
    const name = prompt("Введите имя нового узла:");
    if (!name) return;
    const newNode: TreeNode = { id: Date.now().toString(), name, children: [] };
    setTree((prev) => addNode(prev, parentId, newNode));
  };
  const handleEdit = (node: TreeNode) => {
    const name = prompt("Новое имя узла:", node.name);
    if (!name) return;
    setTree((prev) => editNode(prev, node.id, name));
  };

  const handleDelete = (nodeId: string) => {
    if (!window.confirm("Удалить узел и всех потомков?")) return;
    setTree((prev) => deleteNode(prev, nodeId));
  };

  const handleReset = () => {
    if (window.confirm("Сбросить дерево до исходного состояния?")) {
      setTree(data);
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
      .map((node) => ({
        ...node,
        children: node.children ? deleteNode(node.children, nodeId) : undefined,
      }));
  }

  function moveNode(
    nodes: TreeNode[],
    dragId: string,
    dropId: string | null
  ): TreeNode[] {
    let draggedNode: TreeNode | null = null;

    function remove(nodesArr: TreeNode[]): TreeNode[] {
      return nodesArr
        .filter((n) => {
          if (n.id === dragId) {
            draggedNode = n;
            return false;
          }
          return true;
        })
        .map((n) => ({
          ...n,
          children: n.children ? remove(n.children) : undefined,
        }));
    }

    const withoutDrag = remove(nodes);
    if (!draggedNode) return nodes;

    if (dropId === null) {
      return [...withoutDrag, draggedNode];
    }
    if (isDescendant(nodes, dragId, dropId)) {
      return nodes;
    }
    function insert(nodesArr: TreeNode[]): TreeNode[] {
      return nodesArr.map((n) => {
        if (n.id === dropId) {
          const children = n.children
            ? [...n.children, draggedNode!]
            : [draggedNode!];
          return { ...n, children };
        }
        return { ...n, children: n.children ? insert(n.children) : undefined };
      });
    }
    return insert(withoutDrag);
  }

  // Компонент для узла

  interface DragItem {
    id: string;
    type: string;
  }

  const TreeNodeItem: React.FC<{ node: TreeNode }> = ({ node }) => {
    const [{ canDrop }, dropRef] = useDrop({
      accept: ITEM_TYPE,
      canDrop: (item: DragItem) => {
        if (item.id === node.id) return false;
        return !isDescendant(tree, item.id, node.id);
      },
      drop: (item: DragItem) => {
        setTree((prev) => moveNode(prev, item.id, node.id));
      },
      collect: (monitor) => ({
        canDrop: monitor.canDrop(),
      }),
    });

    // Перетаскивание узла вместе с потомками
    const [{ isDragging }, dragRef] = useDrag({
      type: ITEM_TYPE,
      item: { id: node.id, type: ITEM_TYPE },
      collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    });

    return (
      <li
        key={node.id}
        className={isDragging ? "dragging" : canDrop ? "can-drop" : ""}
        style={{ opacity: isDragging ? 0.5 : 1 }}
      >
        {/* Объединяем dragRef и dropRef на одном элементе */}
        <div
          className="node-content"
          ref={(el) => {
            dragRef(el);
            dropRef(el);
          }}
        >
          <span className="node-label" onClick={() => onNodeClick(node)}>
            {node.name}
          </span>
          <span className="node-buttons">
            <button onClick={() => handleAdd(node.id)}>Add</button>
            <button onClick={() => handleEdit(node)}>Edit</button>
            <button onClick={() => handleDelete(node.id)}>Delete</button>
          </span>
        </div>

        {node.children && node.children.length > 0 && (
          <ul>
            {node.children.map((child) => (
              <TreeNodeItem key={child.id} node={child} />
            ))}
          </ul>
        )}
      </li>
    );
  };

  // Drop на корневую область
  const [{ canDrop: rootCanDrop }, dropRootRef] = useDrop({
    accept: ITEM_TYPE,
    canDrop: (_item, monitor) => monitor.isOver({ shallow: true }),
    drop: (item: DragItem) => {
      setTree((prev) => moveNode(prev, item.id, null));
    },
    collect: (monitor) => ({
      canDrop: monitor.canDrop(),
    }),
  });

  if (loading) {
    return <p>Загрузка дерева…</p>;
  }

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
        <ul className="tree" ref={dropRootRef}>
          {tree.map((node) => (
            <TreeNodeItem key={node.id} node={node} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default Tree;
