import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Button } from "@/components/ui/button";
import { useNavigate, NavLink } from "react-router-dom";
import { Users, Calendar, LogOut, Shield, Settings, Info, Menu, X } from "lucide-react";
import logo from "@/assets/MusicConnectsLogo.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Nav() {
  const { user, session, signOut } = useAuth();
  const { isAdmin } = useUserRoles(user?.id);
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadUserInfo = async () => {
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileData?.full_name) {
          setFullName(profileData.full_name);
        }

        // Check artist profile for avatar
        const { data: artistData } = await supabase
          .from("artists")
          .select("image_url")
          .eq("user_id", user.id)
          .maybeSingle();

        if (artistData?.image_url) {
          setAvatarUrl(artistData.image_url);
        } else if (user.user_metadata?.avatar_url) {
          setAvatarUrl(user.user_metadata.avatar_url);
        }
      } catch (error) {
        console.error("Error loading user info:", error);
      }
    };

    loadUserInfo();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
      isActive ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground hover:text-foreground"
    }`;

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-base ${
      isActive ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground hover:text-foreground"
    }`;

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <img src={logo} alt="Raag Connect" className="h-8 w-8" />
              <span className="text-lg font-semibold text-foreground">Raag Connect</span>
            </button>

            <div className="hidden md:flex items-center gap-1">
              <NavLink to="/" end className={navLinkClass}>
                <Calendar className="h-4 w-4" />
                Discover Events
              </NavLink>
              <NavLink to="/artists" className={navLinkClass}>
                <Users className="h-4 w-4" />
                Discover Artists
              </NavLink>
              <NavLink to="/about" className={navLinkClass}>
                <Info className="h-4 w-4" />
                About
              </NavLink>
              {isAdmin && (
                <NavLink to="/admin" className={navLinkClass}>
                  <Shield className="h-4 w-4" />
                  Admin
                </NavLink>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-2 mt-6">
                  <NavLink 
                    to="/" 
                    end 
                    className={mobileNavLinkClass}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Calendar className="h-5 w-5" />
                    Discover Events
                  </NavLink>
                  <NavLink 
                    to="/artists" 
                    className={mobileNavLinkClass}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Users className="h-5 w-5" />
                    Discover Artists
                  </NavLink>
                  <NavLink 
                    to="/about" 
                    className={mobileNavLinkClass}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Info className="h-5 w-5" />
                    About
                  </NavLink>
                  {isAdmin && (
                    <NavLink 
                      to="/admin" 
                      className={mobileNavLinkClass}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Shield className="h-5 w-5" />
                      Admin
                    </NavLink>
                  )}
                  
                  {session && user && (
                    <>
                      <div className="border-t my-2" />
                      <NavLink 
                        to="/account" 
                        className={mobileNavLinkClass}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Settings className="h-5 w-5" />
                        Account
                      </NavLink>
                      <NavLink 
                        to="/settings" 
                        className={mobileNavLinkClass}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Settings className="h-5 w-5" />
                        Settings
                      </NavLink>
                      <button
                        onClick={() => {
                          handleSignOut();
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-base hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        <LogOut className="h-5 w-5" />
                        Sign Out
                      </button>
                    </>
                  )}
                  
                  {!session && (
                    <>
                      <div className="border-t my-2" />
                      <Button 
                        onClick={() => {
                          navigate("/login");
                          setMobileMenuOpen(false);
                        }}
                        className="w-full"
                      >
                        Sign In
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop User Menu */}
            {session && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarUrl} alt={fullName || "User"} />
                      <AvatarFallback>
                        {fullName ? fullName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium">{fullName || user.email}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => navigate("/account")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {/* Settings gear icon - always visible */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
              className="hidden md:inline-flex"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
            
            {!session && (
              <Button variant="outline" size="sm" onClick={() => navigate("/login")} className="hidden md:inline-flex">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
