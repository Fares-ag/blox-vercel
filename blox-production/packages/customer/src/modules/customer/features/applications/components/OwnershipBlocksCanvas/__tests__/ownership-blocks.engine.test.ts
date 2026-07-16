import { describe, it, expect } from 'vitest';
import {
  cubicEaseInOut,
  filledCellCount,
  sortCarCells,
  type CellCoord,
} from '@customer/features/applications/components/OwnershipBlocksCanvas/ownership-blocks.engine';

describe('ownership-blocks.engine', () => {
  describe('filledCellCount', () => {
    it('returns 0 when total cells is 0', () => {
      expect(filledCellCount(50, 0)).toBe(0);
    });

    it('returns 0 at 0% ownership', () => {
      expect(filledCellCount(0, 100)).toBe(0);
    });

    it('returns all cells at 100% ownership', () => {
      expect(filledCellCount(100, 250)).toBe(250);
    });

    it('rounds to nearest filled cell count', () => {
      expect(filledCellCount(25, 100)).toBe(25);
      expect(filledCellCount(33.3, 100)).toBe(33);
      expect(filledCellCount(33.6, 100)).toBe(34);
    });

    it('clamps ownership below 0 and above 100', () => {
      expect(filledCellCount(-10, 100)).toBe(0);
      expect(filledCellCount(150, 100)).toBe(100);
    });
  });

  describe('sortCarCells', () => {
    it('sorts column-first then row-first (left to right, front to back)', () => {
      const unsorted: CellCoord[] = [
        [2, 5],
        [1, 3],
        [0, 3],
        [1, 5],
        [0, 1],
      ];

      const sorted = sortCarCells(unsorted);

      expect(sorted).toEqual([
        [0, 1],
        [0, 3],
        [1, 3],
        [1, 5],
        [2, 5],
      ]);
    });

    it('does not mutate the input array', () => {
      const input: CellCoord[] = [
        [1, 2],
        [0, 1],
      ];
      const copy = [...input];
      sortCarCells(input);
      expect(input).toEqual(copy);
    });
  });

  describe('cubicEaseInOut', () => {
    it('starts at 0 and ends at 1', () => {
      expect(cubicEaseInOut(0)).toBe(0);
      expect(cubicEaseInOut(1)).toBe(1);
    });

    it('eases through midpoint', () => {
      expect(cubicEaseInOut(0.5)).toBe(0.5);
    });
  });
});
