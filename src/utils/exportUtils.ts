import { StudySet, Question } from '@/types/studyTypes';

/**
 * Exports a study set as a JSON file
 * @param studySet The study set to export
 * @param withProgress Whether to include progress data
 */
export const exportStudySet = (studySet: StudySet, withProgress: boolean = false): void => {
  // Create a copy of the study set
  const exportData: StudySet = {
    ...studySet,
    questions: studySet.questions.map(question => {
      // For fresh export, reset user progress data
      if (!withProgress) {
        return {
          ...question,
          answer: null,
          isUserCorrect: null
        };
      }
      return { ...question };
    })
  };

  // Create a blob from the JSON data
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link element
  const link = document.createElement('a');
  link.href = url;
  
  // Set the file name - sanitize the title to make it filesystem-friendly
  const fileName = `${studySet.title.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '-').toLowerCase()}-${
    withProgress ? 'with-progress' : 'fresh'
  }.json`;
  
  link.setAttribute('download', fileName);
  
  // Append the link to the body
  document.body.appendChild(link);
  
  // Click the link to trigger the download
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}; 