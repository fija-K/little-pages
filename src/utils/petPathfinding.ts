export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface GridCell {
  col: number;
  row: number;
  x: number;
  y: number;
  blocked: boolean;
}

export interface Point {
  x: number;
  y: number;
}

const PADDING = 8; // 8px padding around no-go zones

export function getNoGoZones(): Rect[] {
  if (typeof window === 'undefined' || typeof document === 'undefined') return [];

  const elements = document.querySelectorAll(
    '[data-pet-avoid], .modal-overlay, [role="dialog"], .sticker-tray-panel, .mobile-toolbar, .toast-notification'
  );

  const zones: Rect[] = [];

  elements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    // Ignore invisible / zero-size elements
    if (rect.width > 0 && rect.height > 0) {
      zones.push({
        left: rect.left - PADDING,
        top: rect.top - PADDING,
        right: rect.right + PADDING,
        bottom: rect.bottom + PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2
      });
    }
  });

  return zones;
}

export function isPointInZone(x: number, y: number, zones: Rect[]): boolean {
  for (const z of zones) {
    if (x >= z.left && x <= z.right && y >= z.top && y <= z.bottom) {
      return true;
    }
  }
  return false;
}

export function isRectOverlappingZone(rect: Rect, zones: Rect[]): boolean {
  for (const z of zones) {
    if (
      rect.left < z.right &&
      rect.right > z.left &&
      rect.top < z.bottom &&
      rect.bottom > z.top
    ) {
      return true;
    }
  }
  return false;
}

export function buildGrid(
  viewportWidth: number,
  viewportHeight: number,
  zones: Rect[],
  cellSize: number = 44,
  petWidth: number = 80,
  petHeight: number = 85
): { grid: GridCell[][]; cols: number; rows: number; freeCells: GridCell[] } {
  const cols = Math.floor(viewportWidth / cellSize);
  const rows = Math.floor(viewportHeight / cellSize);
  const grid: GridCell[][] = [];
  const freeCells: GridCell[] = [];

  const safeMarginLeft = 8;
  const safeMarginTop = 8;
  const safeMarginRight = viewportWidth - 8;
  const safeMarginBottom = viewportHeight - 8;

  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      const cellX = c * cellSize + cellSize / 2;
      const cellY = r * cellSize + cellSize / 2;

      // Pet bounding box centered on cell
      const petRect: Rect = {
        left: cellX - petWidth / 2,
        top: cellY - petHeight / 2,
        right: cellX + petWidth / 2,
        bottom: cellY + petHeight / 2,
        width: petWidth,
        height: petHeight
      };

      let blocked = false;

      // Viewport bounds check
      if (
        petRect.left < safeMarginLeft ||
        petRect.top < safeMarginTop ||
        petRect.right > safeMarginRight ||
        petRect.bottom > safeMarginBottom
      ) {
        blocked = true;
      }

      // No-Go Zone overlap check
      if (!blocked && isRectOverlappingZone(petRect, zones)) {
        blocked = true;
      }

      const cellObj: GridCell = { col: c, row: r, x: cellX, y: cellY, blocked };
      grid[r][c] = cellObj;

      if (!blocked) {
        freeCells.push(cellObj);
      }
    }
  }

  return { grid, cols, rows, freeCells };
}

export function findBFSPath(
  grid: GridCell[][],
  cols: number,
  rows: number,
  start: GridCell,
  target: GridCell
): GridCell[] {
  if (start.col === target.col && start.row === target.row) return [];

  const queue: GridCell[] = [start];
  const visited = new Set<string>();
  const parent = new Map<string, GridCell>();

  const key = (c: number, r: number) => `${c},${r}`;
  visited.add(key(start.col, start.row));

  const directions = [
    { dc: 0, dr: -1 },
    { dc: 0, dr: 1 },
    { dc: -1, dr: 0 },
    { dc: 1, dr: 0 },
    { dc: -1, dr: -1 },
    { dc: 1, dr: -1 },
    { dc: -1, dr: 1 },
    { dc: 1, dr: 1 }
  ];

  let found = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.col === target.col && current.row === target.row) {
      found = true;
      break;
    }

    for (const d of directions) {
      const nc = current.col + d.dc;
      const nr = current.row + d.dr;

      if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
        const neighbor = grid[nr][nc];
        const k = key(nc, nr);

        if (!neighbor.blocked && !visited.has(k)) {
          visited.add(k);
          parent.set(k, current);
          queue.push(neighbor);
        }
      }
    }
  }

  if (!found) return [];

  // Reconstruct path
  const path: GridCell[] = [];
  let curr = target;
  while (curr.col !== start.col || curr.row !== start.row) {
    path.unshift(curr);
    const k = key(curr.col, curr.row);
    curr = parent.get(k)!;
  }

  return path;
}

export function findNearestFreeCell(
  grid: GridCell[][],
  cols: number,
  rows: number,
  startCol: number,
  startRow: number
): GridCell | null {
  const key = (c: number, r: number) => `${c},${r}`;
  const visited = new Set<string>();
  const queue: { col: number; row: number }[] = [{ col: startCol, row: startRow }];
  visited.add(key(startCol, startRow));

  const directions = [
    { dc: 0, dr: -1 },
    { dc: 0, dr: 1 },
    { dc: -1, dr: 0 },
    { dc: 1, dr: 0 },
    { dc: -1, dr: -1 },
    { dc: 1, dr: -1 },
    { dc: -1, dr: 1 },
    { dc: 1, dr: 1 }
  ];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.col >= 0 && curr.col < cols && curr.row >= 0 && curr.row < rows) {
      const cell = grid[curr.row][curr.col];
      if (!cell.blocked) {
        return cell;
      }
    }

    for (const d of directions) {
      const nc = curr.col + d.dc;
      const nr = curr.row + d.dr;
      const k = key(nc, nr);

      if (nc >= 0 && nc < cols && nr >= 0 && nr < rows && !visited.has(k)) {
        visited.add(k);
        queue.push({ col: nc, row: nr });
      }
    }
  }

  return null;
}

export function isHopArcSafe(
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  arcHeight: number,
  zones: Rect[],
  viewportWidth: number,
  viewportHeight: number,
  petWidth: number = 80,
  petHeight: number = 85
): boolean {
  // Sample 5 points along parabolic arc
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const currX = startX + (targetX - startX) * t;
    // Parabolic arc displacement
    const arcY = Math.sin(t * Math.PI) * arcHeight;
    const currY = startY + (targetY - startY) * t - arcY;

    const petRect: Rect = {
      left: currX - petWidth / 2,
      top: currY - petHeight / 2,
      right: currX + petWidth / 2,
      bottom: currY + petHeight / 2,
      width: petWidth,
      height: petHeight
    };

    // Check viewport edges (top margin min 8px)
    if (petRect.left < 8 || petRect.top < 8 || petRect.right > viewportWidth - 8 || petRect.bottom > viewportHeight - 8) {
      return false;
    }

    // Check No-Go zones overlap along trajectory
    if (isRectOverlappingZone(petRect, zones)) {
      return false;
    }
  }

  return true;
}
