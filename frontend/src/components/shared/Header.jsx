import React from 'react';
import { LogOut, User, Bell } from 'lucide-react';
import Button from '../ui/Button';

const Header = ({ onLogout, adminName = 'Admin' }) => {
  return (
    <header className="glass-card sticky top-0 z-40 w-full border-b border-white/20">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-lg">BC</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Brain Coins
              </h1>
              <p className="text-xs text-gray-600">Admin Panel</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="relative p-2 hover:bg-gradient-glass rounded-full transition-colors">
            <Bell className="h-5 w-5 text-royal-purple" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>
          
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full glass">
            <User className="h-4 w-4 text-royal-purple" />
            <span className="text-sm font-medium">{adminName}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="flex items-center space-x-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
