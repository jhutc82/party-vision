// ==============================================
// PARTY VISION - FORMATION PRESETS
// ==============================================

export const FORMATION_PRESETS = {
  custom: {
    name: "Custom",
    description: "Custom formation as positioned",
    transform: (dx, dy) => ({ dx, dy })
  },
  
  tight: {
    name: "Tight (50%)",
    description: "Compress formation to 50% spacing",
    transform: (dx, dy) => {
      const transformed = { 
        dx: Math.round(dx * 0.5), 
        dy: Math.round(dy * 0.5) 
      };
      // Ensure at least some spacing if original position was non-zero
      if (transformed.dx === 0 && transformed.dy === 0 && (dx !== 0 || dy !== 0)) {
        transformed.dx = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
        transformed.dy = dy > 0 ? 1 : (dy < 0 ? -1 : 0);
      }
      return transformed;
    }
  },
  
  wide: {
    name: "Wide (150%)",
    description: "Expand formation to 150% spacing",
    transform: (dx, dy) => ({ 
      dx: Math.round(dx * 1.5), 
      dy: Math.round(dy * 1.5) 
    })
  },
  
  column: {
    name: "Column",
    description: "Single-file line formation",
    transform: (dx, dy, index, total) => {
      // Scale spacing based on party size to keep formation compact
      // Small parties (2-3): 1 grid spacing
      // Medium parties (4-5): 1.2 grid spacing  
      // Large parties (6+): 1.5 grid spacing
      const spacing = total <= 3 ? 1 : (total <= 5 ? 1.2 : 1.5);
      const center = (total - 1) / 2;
      return {
        dx: 0,
        dy: Math.round((index - center) * spacing)
      };
    }
  },
  
  line: {
    name: "Line",
    description: "Horizontal line formation",
    transform: (dx, dy, index, total) => {
      // Scale spacing based on party size
      const spacing = total <= 3 ? 1 : (total <= 5 ? 1.2 : 1.5);
      const center = (total - 1) / 2;
      return {
        dx: Math.round((index - center) * spacing),
        dy: 0
      };
    }
  },
  
  wedge: {
    name: "Wedge",
    description: "V-shaped battle formation",
    transform: (dx, dy, index, total) => {
      // Dynamic wedge formation that scales with party size
      // Leader at front (dy negative), others form V behind
      const center = (total - 1) / 2;
      const offset = Math.abs(index - center);
      
      // Scale horizontal and vertical spacing
      const hSpacing = total <= 3 ? 1 : (total <= 5 ? 1.2 : 1.5);
      const vSpacing = total <= 3 ? 1 : (total <= 5 ? 1.5 : 2);
      
      return {
        dx: Math.round((index - center) * hSpacing),
        dy: Math.round(offset * vSpacing)
      };
    }
  },
  
  circle: {
    name: "Circle",
    description: "Defensive circular formation",
    transform: (dx, dy, index, total) => {
      // Arrange party members in a circle
      // Radius scales with party size
      const radius = Math.max(2, Math.ceil(total / 3));
      const angle = (2 * Math.PI * index) / total;
      
      return {
        dx: Math.round(radius * Math.cos(angle)),
        dy: Math.round(radius * Math.sin(angle))
      };
    }
  },
  
  staggered: {
    name: "Staggered",
    description: "Two-row staggered formation",
    transform: (dx, dy, index, total) => {
      // Alternate between front and back rows
      const spacing = total <= 3 ? 1 : (total <= 5 ? 1.2 : 1.5);
      const isBackRow = index % 2 === 0;
      const positionInRow = Math.floor(index / 2);
      const rowSize = Math.ceil(total / 2);
      const center = (rowSize - 1) / 2;
      
      return {
        dx: Math.round((positionInRow - center) * spacing),
        dy: isBackRow ? 1 : 0
      };
    }
  },
  
  box: {
    name: "Box",
    description: "Square perimeter formation",
    transform: (dx, dy, index, total) => {
      // Arrange party in a square perimeter
      if (total <= 4) {
        // For very small parties, just make a simple square
        const positions = [
          { dx: -1, dy: -1 },  // Top-left
          { dx: 1, dy: -1 },   // Top-right
          { dx: -1, dy: 1 },   // Bottom-left
          { dx: 1, dy: 1 }     // Bottom-right
        ];
        return positions[index] || { dx: 0, dy: 0 };
      }
      
      // For larger parties, distribute around perimeter
      const side = Math.ceil(total / 4);
      const perimeter = side * 4;
      const spacing = 1.5;
      
      if (index < side) {
        // Top side
        return { dx: Math.round((index - side/2) * spacing), dy: -side };
      } else if (index < side * 2) {
        // Right side
        return { dx: side, dy: Math.round((index - side - side/2) * spacing) };
      } else if (index < side * 3) {
        // Bottom side
        return { dx: Math.round((side*2 - index + side/2) * spacing), dy: side };
      } else {
        // Left side
        return { dx: -side, dy: Math.round((side*3 - index + side/2) * spacing) };
      }
    }
  }
};
