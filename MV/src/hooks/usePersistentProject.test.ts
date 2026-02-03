import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistentProject } from './usePersistentProject';

const PROJECT_STORAGE_KEY = 'appminuta_selected_project';

describe('usePersistentProject', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with default value when localStorage is empty', () => {
    const { result } = renderHook(() => usePersistentProject('default-project'));

    const [project] = result.current;
    expect(project).toBe('default-project');
  });

  it('should initialize with empty string when no default provided', () => {
    const { result } = renderHook(() => usePersistentProject());

    const [project] = result.current;
    expect(project).toBe('');
  });

  it('should load existing value from localStorage', () => {
    localStorage.setItem(PROJECT_STORAGE_KEY, 'stored-project');

    const { result } = renderHook(() => usePersistentProject('default-project'));

    const [project] = result.current;
    expect(project).toBe('stored-project');
  });

  it('should persist project to localStorage when set', () => {
    const { result } = renderHook(() => usePersistentProject());

    act(() => {
      const [, setProject] = result.current;
      setProject('new-project');
    });

    expect(localStorage.getItem(PROJECT_STORAGE_KEY)).toBe('new-project');

    const [project] = result.current;
    expect(project).toBe('new-project');
  });

  it('should update localStorage when project changes', () => {
    const { result } = renderHook(() => usePersistentProject('initial-project'));

    // First update
    act(() => {
      const [, setProject] = result.current;
      setProject('updated-project-1');
    });

    expect(localStorage.getItem(PROJECT_STORAGE_KEY)).toBe('updated-project-1');

    // Second update
    act(() => {
      const [, setProject] = result.current;
      setProject('updated-project-2');
    });

    expect(localStorage.getItem(PROJECT_STORAGE_KEY)).toBe('updated-project-2');
  });

  it('should remove from localStorage when project is empty string', () => {
    localStorage.setItem(PROJECT_STORAGE_KEY, 'existing-project');

    const { result } = renderHook(() => usePersistentProject('existing-project'));

    act(() => {
      const [, setProject] = result.current;
      setProject('');
    });

    expect(localStorage.getItem(PROJECT_STORAGE_KEY)).toBeNull();
  });

  it('should handle localStorage read errors gracefully', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock localStorage.getItem to throw
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage read error');
    });

    const { result } = renderHook(() => usePersistentProject('fallback-project'));

    const [project] = result.current;
    expect(project).toBe('fallback-project');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error reading project from localStorage:',
      expect.any(Error)
    );

    getItemSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should handle localStorage write errors gracefully', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock localStorage.setItem to throw
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('localStorage write error');
    });

    const { result } = renderHook(() => usePersistentProject());

    act(() => {
      const [, setProject] = result.current;
      setProject('new-project');
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error saving project to localStorage:',
      expect.any(Error)
    );

    setItemSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should return tuple with project and setter', () => {
    const { result } = renderHook(() => usePersistentProject());

    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current).toHaveLength(2);
    expect(typeof result.current[0]).toBe('string');
    expect(typeof result.current[1]).toBe('function');
  });

  it('should persist across hook re-renders', () => {
    const { result, rerender } = renderHook(() => usePersistentProject());

    act(() => {
      const [, setProject] = result.current;
      setProject('persistent-project');
    });

    // Force re-render
    rerender();

    const [project] = result.current;
    expect(project).toBe('persistent-project');
  });

  it('should work with different storage keys (independence)', () => {
    // Set first project
    const { result: result1 } = renderHook(() => usePersistentProject());
    act(() => {
      const [, setProject] = result1.current;
      setProject('project-1');
    });

    // Unmount and mount new hook instance
    const { result: result2 } = renderHook(() => usePersistentProject('default-2'));

    // Should load the previously stored value, not the new default
    const [project2] = result2.current;
    expect(project2).toBe('project-1');
  });
});
