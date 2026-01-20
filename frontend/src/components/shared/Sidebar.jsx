import {
  BarChart3,
  FileText,
  Layers,
  AlertTriangle,
  Edit3,
  Flag
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      description: 'Performance metrics and insights'
    },
    {
      id: 'contentgeneration',
      label: 'AI Generation',
      icon: FileText,
      description: 'Generate questions and materials'
    },
    {
      id: 'contentmanagement',
      label: 'Content Management',
      icon: Layers,
      description: 'Manage questions and learning packs'
    },
    {
      id: 'questioneditor',
      label: 'Question Editor',
      icon: Edit3,
      description: 'Enhanced question editing interface'
    },
    {
      id: 'systemlogs',
      label: 'Error Logs',
      icon: AlertTriangle,
      description: 'AI error monitoring and logs'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: Flag,
      description: 'Manage reported questions'
    },

  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 glass-card border-r border-white/20 min-h-screen">
      {/* Header */}
      <div className="p-6 border-b border-white/20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
              Brain Coins
            </h1>
            <p className="text-xs text-gray-500">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-start space-x-3 p-3 rounded-lg transition-all duration-200 group ${isActive
                  ? 'bg-gradient-primary text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gradient-glass hover:text-gray-900'
                }`}
            >
              <div className={`p-2 rounded-lg ${isActive
                  ? 'bg-white/20'
                  : 'bg-gray-100 group-hover:bg-white/50'
                }`}>
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1 text-left min-w-0">
                <div className={`font-medium text-sm ${isActive ? 'text-white' : 'text-gray-900'
                  }`}>
                  {item.label}
                </div>
                <div className={`text-xs mt-1 ${isActive ? 'text-white/80' : 'text-gray-500'
                  }`}>
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;