import { useState } from 'react';

export interface Position {
  x: number;
  y: number;
}

export const useChalanContextMenu = () => {
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<Position>({ x: 0, y: 0 });
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const handleContextMenu = (event: React.MouseEvent, student: any) => {
    event.preventDefault();
    setSelectedStudent(student);
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setIsContextMenuOpen(true);
  };

  const closeContextMenu = () => {
    setIsContextMenuOpen(false);
  };

  return {
    isContextMenuOpen,
    contextMenuPosition,
    selectedStudent,
    handleContextMenu,
    closeContextMenu,
  };
};

export default useChalanContextMenu;
