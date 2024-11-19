import { NormalizedAlbum, ViewMode } from '@/lib/types';
import React, { useCallback } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeGrid as Grid } from 'react-window';

interface VirtualizedGridProps {
  items: NormalizedAlbum[];
  viewMode: ViewMode;
  ItemComponent: React.ComponentType<any>;
}

const GRID_COLUMN_COUNTS = {
  base: 2, // Default for mobile (< 640px)
  sm: 2, // >= 640px
  md: 3, // >= 768px
  lg: 4, // >= 1024px
  xl: 5, // >= 1280px
  '2xl': 6, // >= 1536px
};

// Add spacing constants
const GRID_GAP = window.innerWidth < 640 ? 16 : 24;
const CELL_PADDING = 16;

const VirtualizedGrid = ({
  items,
  viewMode,
  ItemComponent,
}: VirtualizedGridProps) => {
  const getColumnCount = useCallback((width: number) => {
    if (width >= 1536) return GRID_COLUMN_COUNTS['2xl'];
    if (width >= 1280) return GRID_COLUMN_COUNTS.xl;
    if (width >= 1024) return GRID_COLUMN_COUNTS.lg;
    if (width >= 768) return GRID_COLUMN_COUNTS.md;
    if (width >= 640) return GRID_COLUMN_COUNTS.sm;
    return GRID_COLUMN_COUNTS.base;
  }, []);

  const Cell = useCallback(
    ({ columnIndex, rowIndex, style, data }) => {
      const { items, ItemComponent, columnCount } = data;
      const index = rowIndex * columnCount + columnIndex;

      if (index >= items.length) return null;

      const item = items[index];

      // Adjust the cell style to account for gaps
      const adjustedStyle = {
        ...style,
        left: `${parseFloat(style.left) + GRID_GAP}px`,
        top: `${parseFloat(style.top) + GRID_GAP}px`,
        width: `${parseFloat(style.width) - GRID_GAP}px`,
        height: `${parseFloat(style.height) - GRID_GAP}px`,
        padding: CELL_PADDING,
      };

      return (
        <div style={adjustedStyle}>
          <ItemComponent album={item} viewMode={viewMode} />
        </div>
      );
    },
    [viewMode]
  );

  if (viewMode === 'list') {
    return (
      <div className="grid grid-cols-1 gap-6">
        {items.map((item) => (
          <ItemComponent key={item.id} album={item} viewMode={viewMode} />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        height: 'calc(100vh - 100px)',
        width: '100%',
        padding: `${GRID_GAP}px 0`,
        minHeight: '300px',
      }}
    >
      <AutoSizer>
        {({ height, width }) => {
          const columnCount = getColumnCount(width);
          const availableWidth = width - GRID_GAP * (columnCount + 1); // Account for gaps
          const columnWidth = Math.floor(availableWidth / columnCount);
          const rowHeight = columnWidth + CELL_PADDING * 2; // Add padding to maintain aspect ratio

          return (
            <Grid
              columnCount={columnCount}
              columnWidth={columnWidth + GRID_GAP} // Add gap to column width
              height={height}
              rowCount={Math.ceil(items.length / columnCount)}
              rowHeight={rowHeight + GRID_GAP} // Add gap to row height
              width={width}
              itemData={{
                items,
                ItemComponent,
                columnCount,
              }}
              overscanRowCount={2} // Render 2 extra rows for smoother scrolling
            >
              {Cell}
            </Grid>
          );
        }}
      </AutoSizer>
    </div>
  );
};

export default VirtualizedGrid;
