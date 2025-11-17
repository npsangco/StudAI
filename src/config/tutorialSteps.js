import { 
  LayoutDashboard, 
  FileText, 
  Trophy, 
  Calendar, 
  Brain, 
  MessageSquare,
  Sparkles,
  Target,
  Plus,
  Search,
  Share2,
  FolderOpen,
  Edit3,
  Save,
  Filter,
  PlayCircle,
  Users,
  Video,
  CheckCircle,
  BarChart3,
  Clock,
  Trash2,
  Download,
  Upload,
  Settings
} from 'lucide-react';

export const dashboardTutorialSteps = [
  {
    target: '[data-tutorial="welcome"]',
    title: 'Welcome to StudAI! 🎉',
    description: 'Let\'s take a quick tour of your study dashboard. We\'ll show you all the amazing features to help you excel in your studies.',
    icon: Sparkles,
    tips: [
      'This tour will take less than 2 minutes',
      'You can skip or revisit this tour anytime',
    ],
  },
  {
    target: '[data-tutorial="stats"]',
    title: 'Your Study Statistics',
    description: 'Track your progress in real-time! These cards show your total notes created, available quizzes, completed quizzes, and your current study streak. Each stat updates automatically as you study.',
    icon: LayoutDashboard,
    tips: [
      'Click on any stat card to view detailed analytics',
      'Maintain your streak by logging in daily',
      'Watch your numbers grow as you study more!',
    ],
  },
  {
    target: '[data-tutorial="ai-summarizer"]',
    title: 'AI Study Assistant',
    description: 'Upload PDFs, PowerPoints, or images here and let our AI generate comprehensive summaries instantly. Just drag and drop or click to browse your files.',
    icon: Brain,
    tips: [
      'Supports PDF, PPTX, and image files up to 25MB',
      'Summaries are automatically saved to your notes',
      'Great for reviewing lecture slides quickly',
    ],
  },
  {
    target: '[data-tutorial="quick-actions"]',
    title: 'Quick Access Panel',
    description: 'Jump to your most used features instantly! Create notes, take quizzes, plan your schedule, or start study sessions with a single click. The progress bars show how active you are in each area.',
    icon: Target,
    tips: [
      'These shortcuts save you navigation time',
      'Hover over icons for more details',
      'Progress bars update based on your activity',
    ],
  },
  {
    target: '[data-tutorial="pet-buddy"]',
    title: 'Your Study Companion 🐱',
    description: 'Meet your pet buddy! Take care of them by studying regularly. Feed them, keep them clean, and play together. Your pet grows and evolves as you level up!',
    icon: MessageSquare,
    tips: [
      'Earn points by completing quizzes and creating notes',
      'Visit the pet shop to buy treats and toys',
      'Don\'t forget to feed and clean your pet regularly',
      'Your pet\'s appearance changes as it grows',
    ],
  },
  {
    target: '[data-tutorial="achievements"]',
    title: 'Achievement System',
    description: 'Unlock badges and earn rewards! Complete challenges like "First Quiz", "Study Streak", or "Note Master". Each achievement gives you bonus points and bragging rights.',
    icon: Trophy,
    tips: [
      'Click "View All" to see all available achievements',
      'Some achievements give bonus points',
      'Share your achievements with friends',
    ],
  },
  {
    target: '[data-tutorial="recent-activity"]',
    title: 'Activity Feed',
    description: 'Stay updated with your latest activities! See your recent quiz scores, notes created, and achievements unlocked. Filter by type to focus on specific activities.',
    icon: Calendar,
    tips: [
      'Click any activity to view full details',
      'Recent Quizzes show your latest scores',
      'Recent Notes display your newest study materials',
    ],
  },
];

export const notesTutorialSteps = [
  {
    target: '[data-tutorial="notes-header"]',
    title: 'Welcome to Notes! 📝',
    description: 'This is your central hub for all study materials. Create, organize, and manage your notes with powerful features.',
    icon: FileText,
    tips: [
      'Notes support rich text formatting',
      'Organize with categories and tags',
      'Share notes with study groups',
      'The closest-due plan from your date appears at the top',
    ],
  },
  {
    target: '[data-tutorial="create-note"]',
    title: 'Create New Note',
    description: 'Click here to create a new note. You\'ll get a rich text editor with formatting options, the ability to add images, and automatic saving.',
    icon: Plus,
    tips: [
      'Notes auto-save as you type',
      'Use categories to organize your subjects',
      'Add tags for easy searching',
    ],
  },
  {
    target: '[data-tutorial="search-notes"]',
    title: 'Search Your Notes',
    description: 'Quickly find any note using the search bar. Search by title, content, category, or tags. Results appear instantly as you type.',
    icon: Search,
    tips: [
      'Search works across all note content',
      'Use filters to narrow results',
      'Recent searches are saved for quick access',
    ],
  },
  {
    target: '[data-tutorial="categories"]',
    title: 'Note Categories',
    description: 'Organize notes by subject or topic. Create custom categories like "Math", "History", or "Science". Filter your notes by category with one click.',
    icon: FolderOpen,
    tips: [
      'Color-code categories for visual organization',
      'One note can have multiple categories',
      'Create unlimited categories',
    ],
  },
  {
    target: '[data-tutorial="note-actions"]',
    title: 'Note Actions',
    description: 'Each note has quick actions: Edit to modify content, Share to collaborate with classmates, Delete to remove, and Download to export as PDF.',
    icon: Edit3,
    tips: [
      'Shared notes can be edited by multiple users',
      'Deleted notes go to trash (recoverable)',
      'Export notes for offline studying',
    ],
  },
];

export const quizTutorialSteps = [
  {
    target: '[data-tutorial="quiz-list"]',
    title: 'My Quizzes 📚',
    description: 'Browse and manage all your quizzes here. View your quiz library, and switch between your personal quizzes and quiz battles.',
    icon: PlayCircle,
    tips: [
      'Quizzes can be auto-generated from your notes',
      'All your quizzes are saved and accessible anytime',
      'Switch tabs to access different quiz modes',
    ],
  },
  {
    target: '[data-tutorial="create-quiz"]',
    title: 'Create New Quiz',
    description: 'Click here to create a new quiz! You can add questions manually or let AI generate them automatically from your study materials.',
    icon: Plus,
    tips: [
      'AI can create multiple choice, true/false, and matching questions',
      'Set difficulty level and time limits',
      'Preview before publishing',
    ],
  },
  {
    target: '[data-tutorial="quiz-battles"]',
    title: 'Quiz Battles ⚔️',
    description: 'Switch to this tab to join competitive quiz battles! Enter a game PIN to compete with friends in real-time multiplayer quiz sessions.',
    icon: Users,
    tips: [
      'Battles support multiple players',
      'Winners earn bonus points',
      'Great for group study sessions',
    ],
  },
  {
    target: '[data-tutorial="join-battle"]',
    title: 'Join a Battle',
    description: 'Enter a 6-digit game PIN to join an active quiz battle. Your friend or teacher will provide the PIN when they create a battle room.',
    icon: Video,
    tips: [
      'Make sure you have a stable internet connection',
      'The game PIN is provided by the battle host',
      'Join quickly before the battle starts!',
    ],
  },
];

export const plannerTutorialSteps = [
  {
    target: '[data-tutorial="planner-header"]',
    title: 'Welcome to Study Planner! 📅',
    description: 'Organize your study schedule, set deadlines, and manage your time effectively. Never miss an assignment or exam again!',
    icon: Calendar,
    tips: [
      'Sync with your calendar app',
      'Get reminders before deadlines',
      'Track completed vs pending tasks',
    ],
  },
  {
    target: '[data-tutorial="add-task"]',
    title: 'Add a Study Task',
    description: 'Click the "Add a plan" button to create a new study task. Try it now to proceed!',
    icon: Plus,
    tips: [
      'Set priority: High, Medium, or Low',
      'Add time estimates to better plan',
      'Link tasks to specific subjects',
    ],
    action: 'click',
    interactive: true,
  },
  {
    target: '[data-tutorial="add-task"]',
    title: 'Add Study Task',
    description: 'Create new tasks or assignments. Set due dates and add notes. The planner will remind you as deadlines approach.',
    icon: Plus,
    tips: [
      'Add time estimates to better plan',
      'Link tasks to specific subjects',
      // Removed priority tip
    ],
  },
  {
    target: '[data-tutorial="calendar-view"]',
    title: 'Calendar View',
    description: 'Visualize your schedule at a glance. Switch between day, week, or month views. Color-coded events help you identify different subjects quickly.',
    icon: Calendar,
    tips: [
      'Drag and drop to reschedule tasks',
      'Click dates to see detailed view',
      'Export calendar to PDF',
    ],
  },
  {
    target: '[data-tutorial="upcoming-tasks"]',
    title: 'Upcoming Tasks',
    description: 'See all your upcoming deadlines and tasks in one place. Tasks are sorted by due date with the most urgent at the top. Check off completed items!',
    icon: CheckCircle,
    tips: [
      'Red badges indicate urgent tasks',
      'Click to mark as complete',
      'Filter by subject',
    ],
  },
];

export const sessionsTutorialSteps = [
  {
    target: '[data-tutorial="sessions-header"]',
    title: 'Welcome to Study Sessions! 👥',
    description: 'Collaborate with classmates in real-time! Host or join study sessions with integrated video chat, screen sharing, and collaborative tools.',
    icon: Video,
    tips: [
      'Powered by Zoom integration',
      'Record sessions for later review',
      'Share notes and quizzes in real-time',
    ],
  },
  {
    target: '[data-tutorial="create-session"]',
    title: 'Create Session',
    description: 'Host a new study session. Choose a topic, set a time, and invite participants. You can make it public or private.',
    icon: Plus,
    tips: [
      'Public sessions appear in the directory',
      'Private sessions require invite links',
      'Set session duration and capacity',
    ],
  },
  {
    target: '[data-tutorial="active-sessions"]',
    title: 'Active Sessions',
    description: 'Join ongoing study sessions! See who\'s hosting, what subject they\'re studying, and how many participants are already in. Click to join instantly.',
    icon: Users,
    tips: [
      'Filter by subject to find relevant sessions',
      'See participant count before joining',
      'Leave and rejoin anytime',
    ],
  },
  {
    target: '[data-tutorial="session-features"]',
    title: 'Session Features',
    description: 'During sessions: share your screen, use whiteboard for diagrams, collaborate on notes, and take group quizzes together. Everything you need for effective group study!',
    icon: Settings,
    tips: [
      'Host can mute/unmute participants',
      'Shared whiteboard saves automatically',
      'Chat history is preserved',
    ],
  },
];

export const profileTutorialSteps = [
  {
    target: '[data-tutorial="profile-header"]',
    title: 'Your Profile! 👤',
    description: 'Manage your account settings, view your achievements, track your progress, and customize your study experience.',
    icon: Settings,
    tips: [
      'Update your profile picture',
      'Change notification preferences',
      'View your study statistics',
    ],
  },
  {
    target: '[data-tutorial="profile-stats"]',
    title: 'Profile Statistics',
    description: 'Your complete study analytics dashboard. See total study time, quiz performance trends, note creation patterns, and achievement progress.',
    icon: BarChart3,
    tips: [
      'Compare with previous months',
      'Export reports for tracking',
      'Set personal improvement goals',
    ],
  },
  {
    target: '[data-tutorial="achievements-showcase"]',
    title: 'Achievement Showcase',
    description: 'Display your earned badges and achievements. Choose which achievement to feature on your profile. Show off your study accomplishments!',
    icon: Trophy,
    tips: [
      'Earned achievements appear here',
      'Click to equip featured achievement',
      'Share achievements on social media',
    ],
  },
  {
    target: '[data-tutorial="settings"]',
    title: 'Account Settings',
    description: 'Customize your experience: Change password, update email, set notification preferences, choose themes, and manage privacy settings.',
    icon: Settings,
    tips: [
      'Enable/disable email notifications',
      'Choose dark or light theme',
      'Manage connected accounts',
    ],
  },
];
