import { useEffect, useState, useRef } from 'react'
import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { Target } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_BASE } from './api'
import ToastContainer from './ToastContainer'
import { useToast } from '../hooks/useToast'
import DailyQuests from './DailyQuests'

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Notes', href: '/notes' },
  { name: 'Quizzes', href: '/quizzes' },
  { name: 'Sessions', href: '/sessions' },
  { name: 'Planner', href: '/planner' },
]

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { toasts, toast, removeToast } = useToast()
  const [userPhoto, setUserPhoto] = useState(null)
  const [showQuests, setShowQuests] = useState(false)
  const [isChatbotActive, setIsChatbotActive] = useState(false)
  const questsRef = useRef(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/user/profile`, { withCredentials: true });
        if (res.data?.profile_picture) {
          const pic = res.data.profile_picture;
          setUserPhoto(pic.startsWith("http") ? pic : `${API_BASE}${pic}`);
        } else {
          setUserPhoto(null);
        }
      } catch (err) {
        console.error("Failed to fetch user:", err);
        setUserPhoto(null);
      }
    };

    fetchUser();

    // 🔔 Listen for profile update events
    const handleProfileUpdate = () => fetchUser();
    window.addEventListener("profileUpdated", handleProfileUpdate);

    // 🎯 Listen for quest activity events (refresh daily stats)
    const handleQuestActivity = () => {
      if (questsRef.current && showQuests) {
        questsRef.current.refresh();
      }
    };
    window.addEventListener("questActivity", handleQuestActivity);

    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
      window.removeEventListener("questActivity", handleQuestActivity);
    };
  }, [showQuests]);

  // Observe body class to detect when chatbot is active
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsChatbotActive(document.body.classList.contains('chatbot-active'));
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Check initial state
    setIsChatbotActive(document.body.classList.contains('chatbot-active'));

    return () => observer.disconnect();
  }, []);


  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE}/api/auth/logout`, {}, { withCredentials: true })
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
      toast.error('Failed to log out')
    }
  }

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <Disclosure
      as="nav"
      className="relative z-40 bg-yellow-300 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-white/10"
    >
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-white/5 hover:text-white focus:outline-2 focus:-outline-offset-1 focus:outline-indigo-500">
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Open main menu</span>
              <Bars3Icon aria-hidden="true" className="block size-6 group-data-open:hidden" />
              <XMarkIcon aria-hidden="true" className="hidden size-6 group-data-open:block" />
            </DisclosureButton>
          </div>

          {/* Logo + nav links */}
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex shrink-0 items-center">
              <Link
                to="/dashboard"
                className="flex items-center text-2xl font-bold tracking-tight text-black hover:text-white transition-colors"
              >
                <img 
                  src="/StudAI_Logo-black.png" 
                  alt="StudAI Logo" 
                  className="w-8 h-8"
                />
                Stud<span className="text-indigo-500">AI</span>
              </Link>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:justify-center">
              <div className="flex space-x-4">
                {navigation.map((item) => {
                  const isCurrent = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      aria-current={isCurrent ? 'page' : undefined}
                      className={classNames(
                        isCurrent
                          ? 'bg-gray-950/50 text-white'
                          : 'text-black hover:bg-white/5 hover:text-white',
                        'rounded-md px-3 py-2 text-sm font-medium',
                      )}
                    >
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Profile dropdown */}
          <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            <Menu as="div" className="relative ml-1">
              <MenuButton className="relative flex rounded-full ring-2 ring-black/20 hover:ring-black/40 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white shadow-lg hover:shadow-xl hover:scale-110 transform duration-200">
                <span className="absolute -inset-1.5" />
                <span className="sr-only">Open user menu</span>
                <img
                  alt=""
                  src={userPhoto || `${API_BASE}/uploads/profile_pictures/default-avatar.png`}
                  className="size-10 rounded-full bg-gray-800 object-cover border-2 border-white"
                />

              </MenuButton>

              <MenuItems
                transition
                className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-2xl border border-gray-200 py-1 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
              >
                <MenuItem>
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-yellow-50 font-medium transition-colors"
                  >
                    Your profile
                  </Link>
                </MenuItem>
                <MenuItem>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 font-medium transition-colors"
                  >
                    Sign out
                  </button>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
        </div>
      </div>

      <DisclosurePanel className="sm:hidden">
        <div className="space-y-1 px-2 pt-2 pb-3">
          {navigation.map((item) => {
            const isCurrent = location.pathname === item.href
            return (
              <DisclosureButton
                key={item.name}
                as={Link}
                to={item.href}
                aria-current={isCurrent ? 'page' : undefined}
                className={classNames(
                  isCurrent
                    ? 'bg-gray-950/50 text-white'
                    : 'text-white hover:bg-white/5 hover:text-white',
                  'block rounded-md px-3 py-2 text-base font-medium',
                )}
              >
                {item.name}
              </DisclosureButton>
            )
          })}
        </div>
      </DisclosurePanel>
    </Disclosure>

    {/* Floating Daily Quest Button - Hidden when chatbot is active */}
    {!isChatbotActive && (
      <button
        onClick={() => setShowQuests(true)}
        className={`fixed bottom-24 right-6 z-50 p-4 rounded-full bg-black transition-all shadow-lg hover:shadow-2xl group ${questsRef.current?.isAllComplete() ? '' : 'animate-bounce'}`}
        title="Daily Quests"
      >
        <Target className="w-6 h-6 text-white" />
        {!questsRef.current?.isAllComplete() && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            !
          </span>
        )}
      </button>
    )}

    {/* Daily Quests Modal */}
    <DailyQuests ref={questsRef} isOpen={showQuests} onClose={() => setShowQuests(false)} />
    </>
  )
}
