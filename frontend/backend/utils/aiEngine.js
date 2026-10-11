// Using native global fetch instead of axios

const SUBJECT_TIPS = {
  mathematics: [
    "Practice solving at least 3 equations daily. Work through problems step-by-step.",
    "Draw out coordinate graphs or geometric shapes to visualize variables and intercepts.",
    "Form study groups to explain complex mathematical proofs to classmates."
  ],
  physics: [
    "Focus on drawing Free Body Diagrams to visually capture active forces.",
    "Review dimensional analysis to check if unit calculations match target formulas.",
    "Relate formulas to real-world phenomena (e.g. friction on vehicle braking)."
  ],
  chemistry: [
    "Use color-coded flashcards to memorize periodic properties and element states.",
    "Write out chemical equation coefficients and balance elements one-by-one.",
    "Visualize three-dimensional molecular geometry configurations."
  ],
  biology: [
    "Sketch and label cellular, anatomical, and botanical systems repeatedly.",
    "Break down long biological terms into their Latin or Greek prefix/suffix roots.",
    "Create comprehensive flowcharts explaining complex metabolic cycle stages."
  ],
  "computer science": [
    "Trace variable values line-by-line using a dry-run table.",
    "Break down programs into single-purpose modular functions.",
    "Write clean code comments explaining your logic before coding."
  ],
  english: [
    "Write active weekly journals to practice advanced syntax and vocabulary.",
    "Highlight key structural thesis statements in literary texts.",
    "Engage in loud reading sessions to polish delivery and grammar structure."
  ]
};

const MOTIVATIONAL_QUOTES = [
  "Consistency is the key to success. Focus on improving by just 1% every day!",
  "Every expert was once a beginner. Keep putting in the effort, and you'll see great progress!",
  "Challenges are what make life interesting, and overcoming them is what makes life meaningful. You've got this!",
  "Don't count the days, make the days count. Your dedication today shapes your performance tomorrow!"
];

// Fallback rule-based recommendation generator
const generateRuleBasedRecommendations = (marks) => {
  const weakSubjects = [];
  const performanceMap = {};

  // Group marks by subject and calculate average percentage
  marks.forEach(m => {
    const sub = m.subject.toLowerCase();
    if (!performanceMap[sub]) {
      performanceMap[sub] = { obtained: 0, max: 0 };
    }
    performanceMap[sub].obtained += m.marksObtained;
    performanceMap[sub].max += m.maxMarks;
  });

  const subjectAverages = [];
  Object.keys(performanceMap).forEach(sub => {
    const avg = (performanceMap[sub].obtained / performanceMap[sub].max) * 100;
    subjectAverages.push({ subject: sub, average: avg });
    if (avg < 40) {
      weakSubjects.push(sub);
    }
  });

  // Pick tips for weak subjects
  const tips = [];
  weakSubjects.forEach(sub => {
    const tipsList = SUBJECT_TIPS[sub] || [
      "Review the chapter summary section at the end of each textbook segment.",
      "Break down your study sessions into 25-minute blocks using the Pomodoro technique.",
      "Consult your instructor for step-by-step guidance on weak units."
    ];
    tips.push({
      subject: sub,
      tip: tipsList[Math.floor(Math.random() * tipsList.length)]
    });
  });

  // General weekly focus
  let weeklyFocus = "Maintain your current routine and review upcoming syllabus segments.";
  if (weakSubjects.length > 0) {
    const primaryWeak = weakSubjects[0];
    weeklyFocus = `Focus this week on mastering the foundations of ${primaryWeak.charAt(0).toUpperCase() + primaryWeak.slice(1)}.`;
  }

  const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];

  return {
    isAI: false,
    weakSubjects: weakSubjects.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
    tips,
    weeklyFocus,
    motivation: quote,
    atRisk: weakSubjects.length > 0
  };
};

// Main recommendation engine orchestrator
const getRecommendations = async (studentName, marks) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return generateRuleBasedRecommendations(marks);
  }

  try {
    const marksSummary = marks.map(m => 
      `- ${m.subject} (${m.examType}, Semester: ${m.semester}): ${m.marksObtained}/${m.maxMarks}`
    ).join('\n');

    const prompt = `
You are an encouraging academic AI advisor. Review the student's grades and provide study recommendations.
Student Name: ${studentName}
Academic record:
${marksSummary}

Please respond with a JSON object strictly in the following format:
{
  "weakSubjects": ["Subject 1", "Subject 2"], // Subjects where average score is below 40%
  "tips": [
    {"subject": "Subject Name", "tip": "Subject-specific study advice"}
  ],
  "weeklyFocus": "A brief actionable focus phrase for this week (e.g. Focus this week on active math practice)",
  "motivation": "A highly motivational, positive sentence tailored to this student's status.",
  "atRisk": true // true if they have one or more weak subjects (below 40%), false otherwise
}
Make sure the tone is warm, inspiring, and completely positive (never discouraging). Return ONLY raw JSON, no markdown code blocks.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        }),
        signal: AbortSignal.timeout(5000)
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini HTTP error ${response.status}`);
    }

    const data = await response.json();
    let textResponse = data.candidates[0].content.parts[0].text;
    
    // Clean up potential markdown formatting in case Gemini returns it
    textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const aiData = JSON.parse(textResponse);
    return {
      isAI: true,
      ...aiData
    };
  } catch (error) {
    console.error("Gemini AI API Call failed, falling back to local rule-based system:", error.message);
    return generateRuleBasedRecommendations(marks);
  }
};

module.exports = {
  getRecommendations,
  generateRuleBasedRecommendations
};
