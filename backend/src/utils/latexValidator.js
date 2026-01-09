/**
 * Validate and fix LaTeX issues in generated questions
 */

export const validateAndFixLaTeX = (questions) => {
  return questions.map(question => {
    if (question.type === 'FIIB' && question.question) {
      // Fix blanks inside LaTeX delimiters
      let fixedQuestion = question.question;
      
      // Replace patterns like $(a^m)^n = a^{___}$ with $(a^m)^n =$ ___ $
      fixedQuestion = fixedQuestion.replace(/\$([^$]*)\{___\}([^$]*)\$/g, '$$$1$$$ ___ $$$2$$$');
      
      // Replace any remaining _ inside $...$ patterns
      fixedQuestion = fixedQuestion.replace(/\$([^$]*?)___([^$]*?)\$/g, '$$$1$$$ ___ $$$2$$$');
      
      question.question = fixedQuestion;
    }
    return question;
  });
};
