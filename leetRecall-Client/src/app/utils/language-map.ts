export function mapLanguage(lang: string): string {
    if (!lang) return 'plaintext';

    const lowerLang = lang.toLowerCase();

    const mapping: { [key: string]: string } = {
        'python3': 'python',
        'py': 'python',
        'javascript': 'javascript',
        'js': 'javascript',
        'typescript': 'typescript',
        'ts': 'typescript',
        'java': 'java',
        'c++': 'cpp',
        'cpp': 'cpp',
        'c#': 'csharp',
        'csharp': 'csharp',
        'ruby': 'ruby',
        'rb': 'ruby',
        'go': 'go',
        'golang': 'go',
        'php': 'php',
        'swift': 'swift',
        'kotlin': 'kotlin',
        'kt': 'kotlin',
        'rust': 'rust',
        'rs': 'rust',
        'scala': 'scala',
        'sql': 'sql',
        'bash': 'bash',
        'sh': 'bash',
        'shell': 'bash',
        'html': 'html',
        'xml': 'html',
        'css': 'css',
    };

    return mapping[lowerLang] || 'plaintext';
}