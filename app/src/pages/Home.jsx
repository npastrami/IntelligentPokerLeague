import { Link } from 'react-router-dom'
import { PlayIcon, CodeBracketIcon, TrophyIcon, UserGroupIcon } from '@heroicons/react/24/outline'

export default function Home() {
  const features = [
    {
      name: 'AI Bot Battles',
      description: 'Submit your poker bots and watch them compete against other university teams.',
      icon: CodeBracketIcon,
      href: '/games',
    },
    {
      name: 'Human Play + AI Assist',
      description: 'Play poker with real-time code assistance and strategy optimization.',
      icon: PlayIcon,
      href: '/games',
    },
    {
      name: 'Team Competition',
      description: 'Form teams with your classmates and climb the university rankings.',
      icon: UserGroupIcon,
      href: '/teams',
    },
    {
      name: 'Live Leaderboard',
      description: 'Track your progress and see how you stack up against other players.',
      icon: TrophyIcon,
      href: '/leaderboard',
    },
  ]

  return (
    <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-red-900 min-h-screen">
      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-red-400 to-blue-600 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Intelligent Poker League
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              The ultimate university poker competition. Code your bots, play with AI assistance, 
              and compete for glory in the most advanced poker platform for students.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                to="/register"
                className="rounded-md bg-gradient-to-r from-red-600 to-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-red-500 hover:to-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Get started
              </Link>
              <Link to="/games" className="text-sm font-semibold leading-6 text-white">
                View active games <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-400">Compete & Code</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything you need to dominate the tables
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              {features.map((feature) => (
                <div key={feature.name} className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-white">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-red-600 to-blue-600">
                      <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    {feature.name}
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-slate-300">{feature.description}</dd>
                  <Link
                    to={feature.href}
                    className="mt-2 inline-flex text-sm text-blue-400 hover:text-blue-300"
                  >
                    Learn more →
                  </Link>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white/5 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-3">
            <div className="mx-auto flex max-w-xs flex-col gap-y-4">
              <dt className="text-base leading-7 text-slate-300">Active Universities</dt>
              <dd className="order-first text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                24
              </dd>
            </div>
            <div className="mx-auto flex max-w-xs flex-col gap-y-4">
              <dt className="text-base leading-7 text-slate-300">Bots Submitted</dt>
              <dd className="order-first text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                156
              </dd>
            </div>
            <div className="mx-auto flex max-w-xs flex-col gap-y-4">
              <dt className="text-base leading-7 text-slate-300">Games Played</dt>
              <dd className="order-first text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                2,847
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}