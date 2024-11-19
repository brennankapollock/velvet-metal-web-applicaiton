import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex md:hidden items-center justify-between p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          {sidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
        <h1 className="text-lg font-semibold">Velvet Metal</h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      <div className="flex flex-1">
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 bg-background md:relative md:block',
            sidebarOpen ? 'block' : 'hidden'
          )}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
        <main className="flex-1 bg-background p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
