import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderOpen, Award, UserCheck } from "lucide-react";

const Dashboard = () => {
  const { role } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [categories, participants, scores, judges] = await Promise.all([
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("participants").select("id", { count: "exact", head: true }),
        supabase.from("scores").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "judge"),
      ]);
      return {
        categories: categories.count ?? 0,
        participants: participants.count ?? 0,
        scores: scores.count ?? 0,
        judges: judges.count ?? 0,
      };
    },
  });

  const statCards = [
    { label: "Categories", value: stats?.categories ?? 0, icon: FolderOpen },
    { label: "Participants", value: stats?.participants ?? 0, icon: Users },
    { label: "Judges", value: stats?.judges ?? 0, icon: UserCheck },
    { label: "Scores Entered", value: stats?.scores ?? 0, icon: Award },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">
          {role === "admin" ? "Admin Dashboard" : "Judge Dashboard"}
        </h1>
        <p className="text-muted-foreground">
          Welcome to the Musabaqa Competition Management System
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-heading text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
