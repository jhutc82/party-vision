// ==============================================
// PARTY VISION - FORMATION PRESETS
// ==============================================

export const FORMATION_PRESETS = {
  standard: {
    name: "Standard",
    description: "Default formation as positioned",
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
    transform: (dx, dy, index, total) => ({
      dx: 0,
      dy: index - Math.floor(total / 2)
    })
  },
  
  line: {
    name: "Line",
    description: "Horizontal line formation",
    transform: (dx, dy, index, total) => ({
      dx: index - Math.floor(total / 2),
      dy: 0
    })
  },
  
  wedge: {
    name: "Wedge",
    description: "V-shaped battle formation",
    transform: (dx, dy, index, total) => {
      const center = Math.floor(total / 2);
      const offset = Math.abs(index - center);
      return {
        dx: index - center,
        dy: offset
      };
    }
  }
};
