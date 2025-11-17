import { useState, useEffect, useRef } from 'react';
import { BookOpen, FileText, Brain, Lightbulb, GraduationCap, Trophy, MessageSquare, Pencil, Coffee, Star, Zap, Target, Calendar } from 'lucide-react';

export default function InteractiveBubbles() {
  const containerRef = useRef(null);
  const [bubbles, setBubbles] = useState([]);
  const bubblesRef = useRef([]);
  const animationFrameRef = useRef(null);

  // Initialize bubbles
  useEffect(() => {
    const icons = [BookOpen, FileText, Brain, Lightbulb, GraduationCap, Trophy];
    const colors = [
      'bg-indigo-500',
      'bg-blue-500', 
      'bg-purple-500',
      'bg-pink-500',
      'bg-green-500',
      'bg-yellow-500'
    ];
    
    const initialBubbles = [
      { 
        id: 1, 
        size: 80, 
        x: 100, 
        y: 100, 
        vx: 2, 
        vy: 1.5, 
        color: colors[0],
        icon: icons[0],
        isDragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0
      },
      { 
        id: 2, 
        size: 60, 
        x: 300, 
        y: 200, 
        vx: -1.5, 
        vy: 2, 
        color: colors[1],
        icon: icons[1],
        isDragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0
      },
      { 
        id: 3, 
        size: 50, 
        x: 200, 
        y: 350, 
        vx: 1.8, 
        vy: -1.2, 
        color: colors[2],
        icon: icons[2],
        isDragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0
      },
      { 
        id: 4, 
        size: 70, 
        x: 400, 
        y: 150, 
        vx: -2, 
        vy: 1.8, 
        color: colors[3],
        icon: icons[3],
        isDragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0
      },
      { 
        id: 5, 
        size: 40, 
        x: 150, 
        y: 450, 
        vx: 1.2, 
        vy: -2, 
        color: colors[4],
        icon: icons[4],
        isDragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0
      }
    ];
    
    setBubbles(initialBubbles);
    bubblesRef.current = initialBubbles;
  }, []);

  // Animation loop
  useEffect(() => {
    if (!containerRef.current) return;

    const animate = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      bubblesRef.current = bubblesRef.current.map(bubble => {
        if (bubble.isDragging) return bubble;

        let newX = bubble.x + bubble.vx;
        let newY = bubble.y + bubble.vy;
        let newVx = bubble.vx;
        let newVy = bubble.vy;

        // Bounce off walls
        if (newX <= 0 || newX + bubble.size >= width) {
          newVx = -newVx * 0.95; // Add damping
          newX = Math.max(0, Math.min(width - bubble.size, newX));
        }
        if (newY <= 0 || newY + bubble.size >= height) {
          newVy = -newVy * 0.95; // Add damping
          newY = Math.max(0, Math.min(height - bubble.size, newY));
        }

        return {
          ...bubble,
          x: newX,
          y: newY,
          vx: newVx,
          vy: newVy
        };
      });

      setBubbles([...bubblesRef.current]);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Handle mouse down
  const handleMouseDown = (e, bubbleId) => {
    const bubble = bubblesRef.current.find(b => b.id === bubbleId);
    if (!bubble) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    bubblesRef.current = bubblesRef.current.map(b =>
      b.id === bubbleId
        ? { ...b, isDragging: true, dragOffsetX: offsetX, dragOffsetY: offsetY, vx: 0, vy: 0 }
        : b
    );
    setBubbles([...bubblesRef.current]);
  };

  // Handle mouse move
  const handleMouseMove = (e) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const draggingBubble = bubblesRef.current.find(b => b.isDragging);
    
    if (draggingBubble) {
      const newX = Math.max(0, Math.min(rect.width - draggingBubble.size, e.clientX - rect.left - draggingBubble.dragOffsetX));
      const newY = Math.max(0, Math.min(rect.height - draggingBubble.size, e.clientY - rect.top - draggingBubble.dragOffsetY));

      bubblesRef.current = bubblesRef.current.map(b =>
        b.id === draggingBubble.id
          ? { ...b, x: newX, y: newY }
          : b
      );
      setBubbles([...bubblesRef.current]);
    }
  };

  // Handle mouse up
  const handleMouseUp = (e) => {
    const draggingBubble = bubblesRef.current.find(b => b.isDragging);
    
    if (draggingBubble) {
      // Calculate velocity based on mouse movement
      const vx = (Math.random() - 0.5) * 4;
      const vy = (Math.random() - 0.5) * 4;

      bubblesRef.current = bubblesRef.current.map(b =>
        b.id === draggingBubble.id
          ? { ...b, isDragging: false, vx, vy }
          : b
      );
      setBubbles([...bubblesRef.current]);
    }
  };

  // Handle touch events
  const handleTouchStart = (e, bubbleId) => {
    e.preventDefault();
    const touch = e.touches[0];
    const bubble = bubblesRef.current.find(b => b.id === bubbleId);
    if (!bubble) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;

    bubblesRef.current = bubblesRef.current.map(b =>
      b.id === bubbleId
        ? { ...b, isDragging: true, dragOffsetX: offsetX, dragOffsetY: offsetY, vx: 0, vy: 0 }
        : b
    );
    setBubbles([...bubblesRef.current]);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const touch = e.touches[0];
    const rect = container.getBoundingClientRect();
    const draggingBubble = bubblesRef.current.find(b => b.isDragging);
    
    if (draggingBubble) {
      const newX = Math.max(0, Math.min(rect.width - draggingBubble.size, touch.clientX - rect.left - draggingBubble.dragOffsetX));
      const newY = Math.max(0, Math.min(rect.height - draggingBubble.size, touch.clientY - rect.top - draggingBubble.dragOffsetY));

      bubblesRef.current = bubblesRef.current.map(b =>
        b.id === draggingBubble.id
          ? { ...b, x: newX, y: newY }
          : b
      );
      setBubbles([...bubblesRef.current]);
    }
  };

  const handleTouchEnd = () => {
    const draggingBubble = bubblesRef.current.find(b => b.isDragging);
    
    if (draggingBubble) {
      const vx = (Math.random() - 0.5) * 4;
      const vy = (Math.random() - 0.5) * 4;

      bubblesRef.current = bubblesRef.current.map(b =>
        b.id === draggingBubble.id
          ? { ...b, isDragging: false, vx, vy }
          : b
      );
      setBubbles([...bubblesRef.current]);
    }
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ cursor: 'default' }}
    >
      {/* Animated draggable bubbles */}
      {bubbles.map(bubble => (
        <div
          key={bubble.id}
          className={`absolute rounded-full ${bubble.color} ${bubble.isDragging ? 'cursor-grabbing' : 'cursor-grab'} transition-shadow hover:shadow-xl backdrop-blur-sm`}
          style={{
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            left: `${bubble.x}px`,
            top: `${bubble.y}px`,
            opacity: 0.5,
            userSelect: 'none',
            touchAction: 'none'
          }}
          onMouseDown={(e) => handleMouseDown(e, bubble.id)}
          onTouchStart={(e) => handleTouchStart(e, bubble.id)}
        />
      ))}

      {/* Static decorative bubbles with icons */}
      <div className="w-20 h-20 bg-white/30 rounded-full flex items-center justify-center shadow-lg absolute top-20 right-32 animate-pulse">
        <Pencil className="w-10 h-10 text-red-600" strokeWidth={2.5} />
      </div>
      <div className="w-16 h-16 bg-white/25 rounded-full flex items-center justify-center shadow-lg absolute top-60 right-20 animate-pulse" style={{ animationDelay: '1s' }}>
        <Coffee className="w-8 h-8 text-red-500" strokeWidth={2.5} />
      </div>
      <div className="w-24 h-24 bg-white/35 rounded-full flex items-center justify-center shadow-lg absolute bottom-32 left-20 animate-pulse" style={{ animationDelay: '0.5s' }}>
        <Star className="w-12 h-12 text-yellow-400" strokeWidth={2.5} />
      </div>
      <div className="w-18 h-18 bg-white/30 rounded-full flex items-center justify-center shadow-lg absolute bottom-48 right-40 animate-pulse" style={{ animationDelay: '1.5s' }}>
        <Zap className="w-9 h-9 text-red-600" strokeWidth={2.5} />
      </div>
      <div className="w-20 h-20 bg-white/28 rounded-full flex items-center justify-center shadow-lg absolute top-1/3 left-32 animate-pulse" style={{ animationDelay: '0.8s' }}>
        <Target className="w-10 h-10 text-red-500" strokeWidth={2.5} />
      </div>
      <div className="w-22 h-22 bg-white/32 rounded-full flex items-center justify-center shadow-lg absolute top-1/2 right-16 animate-pulse" style={{ animationDelay: '1.2s' }}>
        <Calendar className="w-11 h-11 text-red-600" strokeWidth={2.5} />
      </div>
      <div className="w-16 h-16 bg-white/26 rounded-full flex items-center justify-center shadow-lg absolute bottom-20 left-1/3 animate-pulse" style={{ animationDelay: '0.3s' }}>
        <Brain className="w-8 h-8 text-purple-500" strokeWidth={2.5} />
      </div>
      <div className="w-20 h-20 bg-white/30 rounded-full flex items-center justify-center shadow-lg absolute top-40 left-1/4 animate-pulse" style={{ animationDelay: '1.8s' }}>
        <MessageSquare className="w-10 h-10 text-blue-500" strokeWidth={2.5} />
      </div>
    </div>
  );
}
