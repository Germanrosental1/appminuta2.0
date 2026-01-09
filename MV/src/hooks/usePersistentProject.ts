import { useState, useEffect } from 'react';

const PROJECT_STORAGE_KEY = 'appminuta_selected_project';

export function usePersistentProject(defaultValue: string = '') {
    const [project, setProject] = useState<string>(() => {
        try {
            const stored = localStorage.getItem(PROJECT_STORAGE_KEY);
            return stored !== null ? stored : defaultValue;
        } catch (error) {
            console.error('Error reading project from localStorage:', error);
            return defaultValue;
        }
    });

    useEffect(() => {
        try {
            if (project) {
                localStorage.setItem(PROJECT_STORAGE_KEY, project);
            } else {
                localStorage.removeItem(PROJECT_STORAGE_KEY);
            }
        } catch (error) {
            console.error('Error saving project to localStorage:', error);
        }
    }, [project]);

    return [project, setProject] as const;
}
