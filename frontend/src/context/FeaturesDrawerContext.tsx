import { createContext, useContext, useState, type ReactNode } from 'react';

interface FeaturesDrawerContextType {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const FeaturesDrawerContext = createContext<FeaturesDrawerContextType | undefined>(undefined);

export function FeaturesDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openDrawer = () => setIsOpen(true);
  const closeDrawer = () => setIsOpen(false);
  const toggleDrawer = () => setIsOpen(prev => !prev);

  return (
    <FeaturesDrawerContext.Provider value={{ isOpen, openDrawer, closeDrawer, toggleDrawer }}>
      {children}
    </FeaturesDrawerContext.Provider>
  );
}

export function useFeaturesDrawer() {
  const context = useContext(FeaturesDrawerContext);
  if (!context) {
    throw new Error('useFeaturesDrawer must be used within a FeaturesDrawerProvider');
  }
  return context;
}

