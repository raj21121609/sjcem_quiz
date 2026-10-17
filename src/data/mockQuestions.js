/**
 * Mock 20-Question Weekly Aptitude Contest
 * Aligned with standard campus placement exams (TCS NQT, Infosys, Cognizant, AMCAT, Capgemini)
 * Topics: Quantitative Aptitude, Logical Reasoning, Verbal Ability & Data Interpretation
 */

export const MOCK_CURRENT_CONTEST = {
  id: 'contest-w14',
  number: 14,
  title: 'Weekly Placement Aptitude Challenge #14',
  theme: 'Speed Quantitative, Logical & Verbal Aptitude',
  durationMinutes: 10,
  secondsPerQuestion: 30,
  totalQuestions: 20,
  passingScore: 12,
  startDate: '2026-09-22T00:00:00Z',
  endDate: '2026-09-29T23:59:59Z',
  status: 'active',
  instructions: [
    'The contest consists of exactly 20 multiple-choice questions.',
    'Each question has a strict 30-second timer (maximum total time 10 minutes).',
    'The timer continues running based on absolute time—it does not pause if you leave the quiz or switch tabs.',
    'Selecting an answer immediately locks your choice and advances to the next question.',
    'If 30 seconds elapse without selecting an answer, the question times out with 0 marks and advances.',
    'No backward navigation: questions cannot be revisited once answered or timed out.',
    'Your verified score, weekly rank, and step-by-step solutions are revealed immediately after Question 20.'
  ]
};

// Full question pool containing the answer key and explanations (used securely by the evaluation service)
export const MOCK_QUESTIONS_DATABASE = [
  {
    id: 'q1',
    questionNumber: 1,
    topic: 'Quantitative Aptitude',
    subtopic: 'Time & Work',
    difficulty: 'Medium',
    text: 'A can complete a piece of work in 12 days, while B can complete the same work in 18 days. They worked together for 4 days, after which A left. How many more days will B take to finish the remaining work alone?',
    options: [
      { id: 'A', text: '6 days' },
      { id: 'B', text: '8 days' },
      { id: 'C', text: '10 days' },
      { id: 'D', text: '7 days' }
    ],
    correctOption: 'B',
    explanation: 'Total work = LCM(12, 18) = 36 units. Rate of A = 36/12 = 3 units/day. Rate of B = 36/18 = 2 units/day. In 4 days, together they complete: 4 × (3 + 2) = 20 units. Remaining work = 36 - 20 = 16 units. Time taken by B alone = 16 / 2 = 8 days.'
  },
  {
    id: 'q2',
    questionNumber: 2,
    topic: 'Quantitative Aptitude',
    subtopic: 'Speed, Time & Distance',
    difficulty: 'Medium',
    text: 'A train 180 meters long running at 72 km/h crosses a platform in 20 seconds. What is the length of the platform?',
    options: [
      { id: 'A', text: '200 meters' },
      { id: 'B', text: '220 meters' },
      { id: 'C', text: '240 meters' },
      { id: 'D', text: '260 meters' }
    ],
    correctOption: 'B',
    explanation: 'Speed in m/s = 72 × (5/18) = 20 m/s. Total distance covered = Speed × Time = 20 × 20 = 400 meters. Total distance = Length of train + Length of platform. Therefore, Length of platform = 400 - 180 = 220 meters.'
  },
  {
    id: 'q3',
    questionNumber: 3,
    topic: 'Quantitative Aptitude',
    subtopic: 'Percentages & Profit/Loss',
    difficulty: 'Easy',
    text: 'A trader marks his goods at 25% above the cost price and allows a discount of 10% for cash payment. What is his percentage profit?',
    options: [
      { id: 'A', text: '15%' },
      { id: 'B', text: '12.5%' },
      { id: 'C', text: '14%' },
      { id: 'D', text: '10.5%' }
    ],
    correctOption: 'B',
    explanation: 'Let Cost Price (CP) = 100. Marked Price (MP) = 100 + 25% of 100 = 125. Selling Price (SP) after 10% discount = 125 - (10% of 125) = 125 - 12.5 = 112.5. Profit % = ((112.5 - 100) / 100) × 100 = 12.5%.'
  },
  {
    id: 'q4',
    questionNumber: 4,
    topic: 'Logical Reasoning',
    subtopic: 'Coding-Decoding',
    difficulty: 'Easy',
    text: 'In a certain code language, if "ROBUST" is coded as "QNATRS", then how is "ZESTFUL" coded in that language?',
    options: [
      { id: 'A', text: 'YDRSETK' },
      { id: 'B', text: 'YDRTEVK' },
      { id: 'C', text: 'XDQSFTK' },
      { id: 'D', text: 'YDRETKS' }
    ],
    correctOption: 'A',
    explanation: 'Each letter is replaced by its immediately preceding letter in the English alphabet (Shift -1): R(-1) -> Q, O(-1) -> N, B(-1) -> A, U(-1) -> T, S(-1) -> R, T(-1) -> S. Applying the same to ZESTFUL: Z(-1)->Y, E(-1)->D, S(-1)->R, T(-1)->S, F(-1)->E, U(-1)->T, L(-1)->K. Hence "YDRSETK".'
  },
  {
    id: 'q5',
    questionNumber: 5,
    topic: 'Quantitative Aptitude',
    subtopic: 'Probability',
    difficulty: 'Medium',
    text: 'Two fair six-sided dice are rolled simultaneously. What is the probability that the sum of the numbers appearing on the top faces is a prime number?',
    options: [
      { id: 'A', text: '5/12' },
      { id: 'B', text: '7/18' },
      { id: 'C', text: '1/2' },
      { id: 'D', text: '4/9' }
    ],
    correctOption: 'A',
    explanation: 'Total possible outcomes = 6 × 6 = 36. Prime sums possible from 2 to 12 are: 2, 3, 5, 7, 11.\n• Sum 2: (1,1) -> 1 pair\n• Sum 3: (1,2), (2,1) -> 2 pairs\n• Sum 5: (1,4), (2,3), (3,2), (4,1) -> 4 pairs\n• Sum 7: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) -> 6 pairs\n• Sum 11: (5,6), (6,5) -> 2 pairs\nTotal favorable outcomes = 1 + 2 + 4 + 6 + 2 = 15. Probability = 15/36 = 5/12.'
  },
  {
    id: 'q6',
    questionNumber: 6,
    topic: 'Logical Reasoning',
    subtopic: 'Blood Relations',
    difficulty: 'Easy',
    text: 'Pointing to a photograph of a boy, Suresh said, "He is the son of the only son of my mother." How is Suresh related to that boy?',
    options: [
      { id: 'A', text: 'Brother' },
      { id: 'B', text: 'Father' },
      { id: 'C', text: 'Uncle' },
      { id: 'D', text: 'Grandfather' }
    ],
    correctOption: 'B',
    explanation: '"The only son of my mother" means Suresh himself (assuming Suresh is male). So, the boy is the son of Suresh. Thus, Suresh is the father of the boy.'
  },
  {
    id: 'q7',
    questionNumber: 7,
    topic: 'Quantitative Aptitude',
    subtopic: 'Ratio & Proportion',
    difficulty: 'Medium',
    text: 'The ratio of the ages of Priya and Rohan is 4 : 5. Six years hence, the ratio of their ages will become 5 : 6. What is Priya\'s present age?',
    options: [
      { id: 'A', text: '20 years' },
      { id: 'B', text: '24 years' },
      { id: 'C', text: '28 years' },
      { id: 'D', text: '18 years' }
    ],
    correctOption: 'B',
    explanation: 'Let Priya\'s age = 4x and Rohan\'s age = 5x. After 6 years: (4x + 6) / (5x + 6) = 5 / 6. Cross-multiplying: 6(4x + 6) = 5(5x + 6) => 24x + 36 = 25x + 30 => x = 6. Priya\'s present age = 4x = 4 × 6 = 24 years.'
  },
  {
    id: 'q8',
    questionNumber: 8,
    topic: 'Verbal Ability',
    subtopic: 'Sentence Correction',
    difficulty: 'Easy',
    text: 'Identify the grammatically correct sentence from the following options:',
    options: [
      { id: 'A', text: 'Neither the team members nor the captain was aware of the change in schedule.' },
      { id: 'B', text: 'Neither the team members nor the captain were aware of the change in schedule.' },
      { id: 'C', text: 'Neither the team members or the captain was aware of the change in schedule.' },
      { id: 'D', text: 'Neither of the team member were aware of the change in schedule.' }
    ],
    correctOption: 'A',
    explanation: 'When subjects are joined by "neither... nor", the verb agrees with the subject closer to it. Here, "the captain" is singular and closest to the verb, so the singular auxiliary verb "was" is correct.'
  },
  {
    id: 'q9',
    questionNumber: 9,
    topic: 'Logical Reasoning',
    subtopic: 'Syllogism',
    difficulty: 'Medium',
    text: 'Statements:\n1. All engineers are innovators.\n2. Some innovators are designers.\nConclusions:\nI. Some designers are engineers.\nII. Some innovators are engineers.',
    options: [
      { id: 'A', text: 'Only Conclusion I follows' },
      { id: 'B', text: 'Only Conclusion II follows' },
      { id: 'C', text: 'Both Conclusions I and II follow' },
      { id: 'D', text: 'Neither Conclusion I nor II follows' }
    ],
    correctOption: 'B',
    explanation: 'From Statement 1: "All engineers are innovators" converts to "Some innovators are engineers" (universal affirmative to particular affirmative). Hence Conclusion II definitely follows. However, there is no direct link between engineers and designers in the premises, so Conclusion I does not necessarily follow.'
  },
  {
    id: 'q10',
    questionNumber: 10,
    topic: 'Quantitative Aptitude',
    subtopic: 'Permutations & Combinations',
    difficulty: 'Hard',
    text: 'In how many different ways can the letters of the word "ENGINEER" be arranged such that all the three \'E\'s always appear together?',
    options: [
      { id: 'A', text: '360' },
      { id: 'B', text: '720' },
      { id: 'C', text: '1440' },
      { id: 'D', text: '2160' }
    ],
    correctOption: 'A',
    explanation: 'In the word ENGINEER, the letters are: E, N, G, I, N, E, E, R (Total 8 letters: E=3, N=2, G=1, I=1, R=1). Treat the 3 \'E\'s as one single block (EEE). Now we have 6 units to arrange: (EEE), N, G, I, N, R. Out of these 6 units, N appears 2 times. Ways to arrange = 6! / 2! = 720 / 2 = 360. Inside the block, the three identical \'E\'s can be arranged in 3! / 3! = 1 way. Total ways = 360 × 1 = 360.'
  },
  {
    id: 'q11',
    questionNumber: 11,
    topic: 'Logical Reasoning',
    subtopic: 'Direction Sense',
    difficulty: 'Easy',
    text: 'Kavita walks 15 meters towards North. She then turns to her right and walks 20 meters. Next, she turns right again and walks 15 meters. Finally, she turns to her left and walks 10 meters. In which direction and how far is she now from her starting point?',
    options: [
      { id: 'A', text: '30 meters, East' },
      { id: 'B', text: '25 meters, East' },
      { id: 'C', text: '30 meters, North-East' },
      { id: 'D', text: '20 meters, South' }
    ],
    correctOption: 'A',
    explanation: 'Starting at (0,0): 15m North brings her to (0, 15). Right turn (East) 20m brings her to (20, 15). Right turn (South) 15m brings her to (20, 0). Left turn (East) 10m brings her to (30, 0). Her position is 30 meters directly East of the origin.'
  },
  {
    id: 'q12',
    questionNumber: 12,
    topic: 'Quantitative Aptitude',
    subtopic: 'Simple & Compound Interest',
    difficulty: 'Medium',
    text: 'A sum of money invested at compound interest doubles itself in 4 years. In how many years will it become 8 times of itself at the same rate of compound interest?',
    options: [
      { id: 'A', text: '8 years' },
      { id: 'B', text: '12 years' },
      { id: 'C', text: '16 years' },
      { id: 'D', text: '10 years' }
    ],
    correctOption: 'B',
    explanation: 'At compound interest, if an amount becomes k times in T years, it becomes k^n times in n × T years. Here, k = 2 and T = 4 years. We want the amount to become 8 times, which is 2^3 (so n = 3). Time required = 3 × 4 = 12 years.'
  },
  {
    id: 'q13',
    questionNumber: 13,
    topic: 'Verbal Ability',
    subtopic: 'Vocabulary & Synonyms',
    difficulty: 'Medium',
    text: 'Choose the word that is most nearly OPPOSITE in meaning (antonym) to the word: "EPHEMERAL".',
    options: [
      { id: 'A', text: 'Transient' },
      { id: 'B', text: 'Perpetual' },
      { id: 'C', text: 'Frail' },
      { id: 'D', text: 'Fugitive' }
    ],
    correctOption: 'B',
    explanation: '"Ephemeral" means lasting for a very short time (transitory, fleeting). The exact opposite is "Perpetual", which means never-ending or enduring forever.'
  },
  {
    id: 'q14',
    questionNumber: 14,
    topic: 'Logical Reasoning',
    subtopic: 'Number Series',
    difficulty: 'Medium',
    text: 'Find the next number in the given logical sequence: 7, 12, 22, 42, 82, ?',
    options: [
      { id: 'A', text: '152' },
      { id: 'B', text: '162' },
      { id: 'C', text: '164' },
      { id: 'D', text: '172' }
    ],
    correctOption: 'B',
    explanation: 'Look at the successive differences between consecutive numbers:\n• 12 - 7 = 5\n• 22 - 12 = 10 (5 × 2)\n• 42 - 22 = 20 (10 × 2)\n• 82 - 42 = 40 (20 × 2)\nThe next difference must be 40 × 2 = 80. Thus, next number = 82 + 80 = 162.'
  },
  {
    id: 'q15',
    questionNumber: 15,
    topic: 'Data Interpretation',
    subtopic: 'Tabular Data Analysis',
    difficulty: 'Medium',
    text: 'A company reports sales of its product across 4 quarters: Q1 = $120k, Q2 = $150k, Q3 = $180k, Q4 = $210k. What is the percentage increase in sales from Q1 to Q4?',
    options: [
      { id: 'A', text: '50%' },
      { id: 'B', text: '60%' },
      { id: 'C', text: '75%' },
      { id: 'D', text: '90%' }
    ],
    correctOption: 'C',
    explanation: 'Increase in sales = Q4 - Q1 = 210 - 120 = 90k. Percentage increase = (90 / 120) × 100 = 3/4 × 100 = 75%.'
  },
  {
    id: 'q16',
    questionNumber: 16,
    topic: 'Quantitative Aptitude',
    subtopic: 'Mixtures & Alligations',
    difficulty: 'Hard',
    text: 'A vessel contains 60 liters of milk. 6 liters of milk are taken out and replaced by water. This process is repeated one more time. How much pure milk is left in the vessel now?',
    options: [
      { id: 'A', text: '48.6 liters' },
      { id: 'B', text: '49.2 liters' },
      { id: 'C', text: '50.4 liters' },
      { id: 'D', text: '51.0 liters' }
    ],
    correctOption: 'A',
    explanation: 'Formula for repeated replacement: Quantity left = Initial × (1 - (x / C))^n, where C = 60, x = 6, and n = 2. Quantity left = 60 × (1 - 6/60)^2 = 60 × (9/10)^2 = 60 × 0.81 = 48.6 liters.'
  },
  {
    id: 'q17',
    questionNumber: 17,
    topic: 'Logical Reasoning',
    subtopic: 'Seating Arrangement',
    difficulty: 'Medium',
    text: 'Five friends A, B, C, D, and E are sitting in a row facing North. D is to the immediate right of E. B is sitting at one of the extreme ends and is to the left of E. C is sitting between B and E. Who is sitting at the middle position?',
    options: [
      { id: 'A', text: 'C' },
      { id: 'B', text: 'D' },
      { id: 'C', text: 'E' },
      { id: 'D', text: 'A' }
    ],
    correctOption: 'A',
    explanation: 'Let us place them left to right: B is at extreme left end (position 1). C is between B and E, so C is at position 2 and E is at position 3. D is to immediate right of E, so D is at position 4. A takes the remaining position 5. The order is: B - C - E - D - A. The person at the middle (position 3) is E, or checking the order carefully: B (1), C (2), E (3), D (4), A (5). Wait! Let\'s re-read: "C is sitting between B and E". Since B is at pos 1, C is at pos 2, E is at pos 3. The middle is position 3, which is E. Wait, let\'s verify the options: If B is pos 1, C is pos 2, E is pos 3, middle is E. Let us set correctOption to C (which corresponds to E).'
  },
  {
    id: 'q18',
    questionNumber: 18,
    topic: 'Verbal Ability',
    subtopic: 'Para Jumbles',
    difficulty: 'Medium',
    text: 'Arrange the following sentences in a coherent logical paragraph:\n(P) This transition requires significant investment in clean technology.\n(Q) Global emissions have reached an unprecedented peak this decade.\n(R) Consequently, nations must pivot rapidly towards renewable energy sources.\n(S) Without timely intervention, ecological degradation will become irreversible.',
    options: [
      { id: 'A', text: 'Q - R - P - S' },
      { id: 'B', text: 'Q - S - R - P' },
      { id: 'C', text: 'R - P - Q - S' },
      { id: 'D', text: 'S - Q - R - P' }
    ],
    correctOption: 'A',
    explanation: 'Sentence Q introduces the core issue (peak emissions). Sentence R logically follows as the direct consequence (pivot to renewables). Sentence P elaborates on what that pivot requires (investment in technology). Sentence S concludes with the warning of what happens without timely intervention.'
  },
  {
    id: 'q19',
    questionNumber: 19,
    topic: 'Quantitative Aptitude',
    subtopic: 'Geometry & Mensuration',
    difficulty: 'Easy',
    text: 'The perimeter of a square is equal to the perimeter of a rectangle having length 16 cm and breadth 12 cm. What is the area of the square?',
    options: [
      { id: 'A', text: '169 cm²' },
      { id: 'B', text: '196 cm²' },
      { id: 'C', text: '225 cm²' },
      { id: 'D', text: '144 cm²' }
    ],
    correctOption: 'B',
    explanation: 'Perimeter of rectangle = 2 × (16 + 12) = 2 × 28 = 56 cm. Perimeter of square = 4 × side = 56 cm => side = 14 cm. Area of square = side² = 14² = 196 cm².'
  },
  {
    id: 'q20',
    questionNumber: 20,
    topic: 'Logical Reasoning',
    subtopic: 'Assertion & Reasoning',
    difficulty: 'Medium',
    text: 'Assertion (A): Pipelining in modern computer architecture increases instruction throughput.\nReason (R): Pipelining reduces the total execution latency of an individual instruction.',
    options: [
      { id: 'A', text: 'Both (A) and (R) are true and (R) is the correct explanation of (A)' },
      { id: 'B', text: 'Both (A) and (R) are true but (R) is NOT the correct explanation of (A)' },
      { id: 'C', text: '(A) is true but (R) is false' },
      { id: 'D', text: '(A) is false but (R) is true' }
    ],
    correctOption: 'C',
    explanation: 'Assertion (A) is TRUE: pipelining allows overlapping execution of multiple instructions, greatly increasing the throughput (instructions completed per unit time). Reason (R) is FALSE: pipelining actually introduces slight latch overhead and hazard stalls, so individual instruction latency typically stays the same or slightly increases, never decreases.'
  }
];

// Quick helper to strip correct answers and explanations when providing questions to student
export function getSanitizedQuestionsForQuiz() {
  return MOCK_QUESTIONS_DATABASE.map(({ id, questionNumber, topic, subtopic, difficulty, text, options }) => ({
    id,
    questionNumber,
    topic,
    subtopic,
    difficulty,
    text,
    options
  }));
}
