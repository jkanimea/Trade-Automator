import { Button } from "@/components/ui/button";
import { Bell, Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";

export function Header({ title }: { title: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background/50 px-6 backdrop-blur-sm sticky top-0 z-10">
      <h1 className="text-xl font-semibold text-foreground tracking-tight">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search symbol..." className="pl-8 bg-card border-border" />
        </div>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
        </Button>
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
          <User className="h-4 w-4 text-primary" />
        </div>
      </div>
    </header>
  );
}
