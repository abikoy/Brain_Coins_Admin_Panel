# Brain Coins - FRONTEND

**React-based Admin Panel for Brain Coins Educational Platform**

---

## 📁 This is the FRONTEND

All React UI code, components, and browser-side logic are here.

**If you're working on:**
- ✅ User interface
- ✅ React components
- ✅ Styling (Tailwind CSS)
- ✅ Browser-side authentication
- ✅ Charts and visualizations

**Then work in this folder!**

---

## 🛠️ Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **Supabase JS** - Authentication (browser-side)

---

## 📂 Folder Structure

```
frontend/
├── src/
│   ├── components/          # React Components
│   │   ├── ui/              # Basic UI (Button, Card, Input, etc.)
│   │   ├── shared/          # Shared components (Header, Sidebar, etc.)
│   │   └── analytics/       # Analytics-specific components
│   │
│   ├── pages/               # Page Components
│   │   ├── Login.jsx        # Login page
│   │   ├── Dashboard.jsx    # Main dashboard
│   │   ├── Analytics.jsx    # Analytics view
│   │   └── ContentManager.jsx # Content management
│   │
│   ├── context/             # React Context (State Management)
│   │   ├── AuthContext.jsx  # Authentication state
│   │   └── DataContext.jsx  # Application data state
│   │
│   ├── hooks/               # Custom React Hooks
│   │   └── useStudentData.js
│   │
│   ├── lib/                 # Frontend Libraries
│   │   └── supabaseClient.js # Supabase client (FRONTEND)
│   │
│   ├── styles/
│   │   └── globals.css      # Global styles
│   │
│   ├── App.jsx              # Main App component
│   └── main.jsx             # Entry point
│
├── public/                  # Static assets
├── index.html               # HTML template
├── package.json             # Frontend dependencies
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind configuration
└── README.md                # This file
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at **http://localhost:3001**

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

---

## 🔐 Authentication

Frontend uses **Supabase Auth** for authentication:

**File:** `src/lib/supabaseClient.js`

This file contains:
- Browser-side Supabase client
- `signInAdmin()` - Login function
- `signOutAdmin()` - Logout function
- `getCurrentSession()` - Get current session
- `onAuthStateChange()` - Listen to auth changes

---

## 🎨 Styling

### Tailwind CSS

Custom colors defined in `tailwind.config.js`:
- **Royal Purple:** `#7C3AED`
- **Electric Cyan:** `#06B6D4`

### Glassmorphism

Custom CSS utilities in `src/styles/globals.css`:
- `.glass` - Semi-transparent glass effect
- `.glass-dark` - Dark glass effect
- `.glass-card` - Card with glass effect

---

## 📦 Components

### UI Components (`src/components/ui/`)
- `Button.jsx` - Reusable button
- `Card.jsx` - Card container
- `Input.jsx` - Form input
- `Switch.jsx` - Toggle switch
- `Badge.jsx` - Status badge
- `Dialog.jsx` - Modal dialog

### Shared Components (`src/components/shared/`)
- `Header.jsx` - Top navigation
- `Sidebar.jsx` - Side navigation
- `GlassCard.jsx` - Glassmorphism card

### Analytics Components (`src/components/analytics/`)
- `StudentProgressChart.jsx` - Progress bar chart
- `StudentListTable.jsx` - Student data table

---

## 🔄 State Management

### AuthContext (`src/context/AuthContext.jsx`)
Manages authentication state:
- `user` - Current user object
- `isLoggedIn` - Boolean authentication status
- `loading` - Loading state
- `session` - Supabase session
- `login()` - Login function
- `logout()` - Logout function

### DataContext (`src/context/DataContext.jsx`)
Manages application data:
- `students` - Student list
- `progressData` - Progress metrics
- `questions` - Question bank
- `logs` - System logs

---

## 🌐 API Integration

**Note:** Currently, the frontend uses mock data. To connect to the backend API:

1. Update `src/lib/supabaseClient.js` to call backend endpoints
2. Create API service files in `src/api/` folder
3. Replace mock data in `DataContext.jsx` with API calls

---

## 📱 Responsive Design

The app is fully responsive:
- **Desktop:** Full sidebar navigation
- **Tablet:** Collapsible sidebar
- **Mobile:** Bottom tab navigation

---

## 🐛 Troubleshooting

### Port already in use
```bash
# Change port in vite.config.js
server: {
  port: 3002  // Change this
}
```

### Tailwind styles not working
```bash
# Rebuild Tailwind
npm run dev
```

### Supabase connection issues
- Check credentials in `src/lib/supabaseClient.js`
- Verify Supabase project is active
- Check browser console for errors

---

## 📝 Development Guidelines

### File Naming
- Components: `PascalCase.jsx` (e.g., `StudentList.jsx`)
- Hooks: `useCamelCase.js` (e.g., `useAuth.js`)
- Utilities: `camelCase.js` (e.g., `helpers.js`)

### Import Order
1. React imports
2. Third-party libraries
3. Components
4. Hooks
5. Utilities
6. Styles

### Component Structure
```jsx
import React from 'react';

const ComponentName = ({ props }) => {
  // State
  // Effects
  // Handlers
  // Render
  return (
    <div>...</div>
  );
};

export default ComponentName;
```

---

## 🎯 Key Features

- ✅ Glassmorphism design
- ✅ Royal Purple → Electric Cyan gradient
- ✅ Real Supabase authentication
- ✅ Session persistence
- ✅ Responsive layout
- ✅ Interactive charts
- ✅ Modal dialogs
- ✅ Error handling
- ✅ Loading states

---

## 📚 Learn More

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase Docs](https://supabase.com/docs)
- [Recharts](https://recharts.org/)

---

**Need to work on backend?** Go to `../backend/` folder

**Built with ❤️ for Brain Coins**
