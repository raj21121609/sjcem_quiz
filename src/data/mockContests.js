/**
 * Mock Contests Archive & Admin Overview Data
 */

export const MOCK_CONTESTS_LIST = [
  {
    id: 'contest-w14',
    number: 14,
    title: 'Weekly Placement Aptitude Challenge #14',
    theme: 'Comprehensive Quantitative, Logical & Verbal Aptitude',
    status: 'Active',
    questionsCount: 20,
    durationMinutes: 25,
    participantsCount: 142,
    avgScore: 14.8,
    highestScore: 20,
    startDate: '2026-09-22',
    endDate: '2026-09-29',
    difficultyBreakdown: { Easy: 6, Medium: 11, Hard: 3 }
  },
  {
    id: 'contest-w13',
    number: 13,
    title: 'Weekly Placement Aptitude Challenge #13',
    theme: 'Logical Deduction & Analytical Reasoning Special',
    status: 'Completed',
    questionsCount: 20,
    durationMinutes: 25,
    participantsCount: 218,
    avgScore: 13.9,
    highestScore: 20,
    startDate: '2026-09-15',
    endDate: '2026-09-21',
    difficultyBreakdown: { Easy: 5, Medium: 12, Hard: 3 }
  },
  {
    id: 'contest-w12',
    number: 12,
    title: 'Weekly Placement Aptitude Challenge #12',
    theme: 'Speed Quantitative Math & Data Sufficiency',
    status: 'Completed',
    questionsCount: 20,
    durationMinutes: 25,
    participantsCount: 195,
    avgScore: 12.6,
    highestScore: 19,
    startDate: '2026-09-08',
    endDate: '2026-09-14',
    difficultyBreakdown: { Easy: 4, Medium: 13, Hard: 3 }
  },
  {
    id: 'contest-w11',
    number: 11,
    title: 'Weekly Placement Aptitude Challenge #11',
    theme: 'TCS NQT & Infosys Pattern Mock Aptitude',
    status: 'Completed',
    questionsCount: 20,
    durationMinutes: 25,
    participantsCount: 240,
    avgScore: 15.2,
    highestScore: 20,
    startDate: '2026-09-01',
    endDate: '2026-09-07',
    difficultyBreakdown: { Easy: 7, Medium: 10, Hard: 3 }
  },
  {
    id: 'contest-w15',
    number: 15,
    title: 'Weekly Placement Aptitude Challenge #15',
    theme: 'Probability, Combinatorics & Verbal Critical Reasoning',
    status: 'Draft',
    questionsCount: 20,
    durationMinutes: 25,
    participantsCount: 0,
    avgScore: 0,
    highestScore: 0,
    startDate: '2026-09-30',
    endDate: '2026-10-06',
    difficultyBreakdown: { Easy: 6, Medium: 10, Hard: 4 }
  }
];

export const MOCK_ADMIN_STATS = {
  activeContest: {
    number: 14,
    title: 'Weekly Placement Aptitude Challenge #14',
    participants: 142,
    avgScore: '14.8 / 20',
    highestScore: '20 / 20',
    completionRate: '94.2%',
    timeRemaining: '2 days, 7 hours'
  },
  overallMetrics: {
    totalStudentsAssessed: 1284,
    totalContestsConducted: 14,
    averageCampusAptitudeScore: '71.5%',
    placementReadinessRate: '68.4%'
  },
  scoreDistribution: [
    { range: '0 - 5', count: 4, percentage: 3 },
    { range: '6 - 10', count: 18, percentage: 13 },
    { range: '11 - 15', count: 62, percentage: 44 },
    { range: '16 - 18', count: 43, percentage: 30 },
    { range: '19 - 20', count: 15, percentage: 10 }
  ]
};
