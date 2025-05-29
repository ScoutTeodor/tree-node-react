import React from "react";
import Tree, { TreeNode } from "./Tree";

const initialData: TreeNode[] = [
  {
    id: "1",
    name: "Корень 1",
    children: [
      { id: "1-1", name: "Ветка А", children: [] },
      { id: "1-2", name: "Ветка Б", children: [] },
    ],
  },
  { id: "2", name: "Корень 2", children: [] },
];

const App: React.FC = () => {
  const handleNodeClick = (node: TreeNode) => {
    alert(`Клик по узлу: ${node.name}`);
  };

  return (
    <div
      style={{ maxWidth: 500, margin: "40px auto", fontFamily: "sans-serif" }}
    >
      <h2>Дерево</h2>
      <Tree data={initialData} onNodeClick={handleNodeClick} />
    </div>
  );
};

export default App;
