import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Generate unique password for each user
    const generatePassword = (name: string) => {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      return `${name.split(' ')[0]}@${randomNum}`;
    };

    // Get all team members
    const { data: teamMembers, error: fetchError } = await supabaseAdmin
      .from("team_members")
      .select("*");

    if (fetchError) throw fetchError;

    const results = [];

    // Create auth users for each team member
    for (const member of teamMembers || []) {
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
      const userExists = existingUser?.users?.some((u) => u.email === member.email);

      if (!userExists) {
        const userPassword = generatePassword(member.name);
        
        // Create auth user
        const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: member.email,
          password: userPassword,
          email_confirm: true,
          user_metadata: {
            full_name: member.name,
          },
        });

        if (createError) {
          results.push({ email: member.email, name: member.name, status: "error", error: createError.message });
          continue;
        }

        // Link team_member to auth user
        if (authUser?.user) {
          const { error: updateError } = await supabaseAdmin
            .from("team_members")
            .update({ auth_user_id: authUser.user.id })
            .eq("id", member.id);

          if (updateError) {
            results.push({ email: member.email, name: member.name, password: userPassword, status: "linked_error", error: updateError.message });
          } else {
            results.push({ email: member.email, name: member.name, password: userPassword, status: "created", userId: authUser.user.id });
          }
        }
      } else {
        results.push({ email: member.email, name: member.name, status: "exists" });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
