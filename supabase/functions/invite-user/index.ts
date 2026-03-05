import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, ...params } = await req.json();

    // Seed root action doesn't require auth (but checks if root already exists)
    if (action === "seed_root") {
      // Check if root user already exists
      const { data: existingRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "root");

      if (existingRoles && existingRoles.length > 0) {
        // Update existing root user email if needed
        const rootUserId = existingRoles[0].user_id;
        await supabaseAdmin.auth.admin.updateUserById(rootUserId, {
          email: "root@mfai.com",
          password: "R010203r!@#",
          email_confirm: true,
        });
        return new Response(JSON.stringify({ success: true, message: "Root updated" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create root user
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: "root@mfai.com",
          password: "R010203r!@#",
          email_confirm: true,
          user_metadata: { display_name: "Root" },
        });

      if (createError) {
        if (createError.message?.includes("already been registered")) {
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
          const rootUser = users?.find((u: any) => u.email === "root@mfai.com");
          if (rootUser) {
            await supabaseAdmin.from("user_roles").upsert(
              { user_id: rootUser.id, role: "root" },
              { onConflict: "user_id,role" }
            );
          }
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (newUser.user) {
        await supabaseAdmin
          .from("user_roles")
          .update({ role: "root" })
          .eq("user_id", newUser.user.id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions require auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is admin or root
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    
    const callerRoleList = (callerRoles || []).map((r: any) => r.role);
    const isRoot = callerRoleList.includes("root");
    const isAdmin = callerRoleList.includes("admin") || isRoot;

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "invite") {
      const { email, role, client_id, display_name } = params;

      const { data: invitation, error: invError } = await supabaseAdmin
        .from("invitations")
        .insert({
          email,
          role,
          client_id: client_id || null,
          invited_by: caller.id,
        })
        .select()
        .single();

      if (invError) {
        return new Response(JSON.stringify({ error: invError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tempPassword = params.temp_password || "TempPass123!";
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { display_name: display_name || email },
        });

      if (createError) {
        await supabaseAdmin.from("invitations").delete().eq("id", invitation.id);
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, user_id: newUser.user?.id, invitation }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "pause_user") {
      const { user_id } = params;
      await supabaseAdmin
        .from("profiles")
        .update({ status: "paused" })
        .eq("user_id", user_id);
      await supabaseAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: "876000h",
      });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "activate_user") {
      const { user_id } = params;
      await supabaseAdmin
        .from("profiles")
        .update({ status: "active" })
        .eq("user_id", user_id);
      await supabaseAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: "none",
      });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove_user") {
      const { user_id } = params;
      await supabaseAdmin
        .from("profiles")
        .update({ status: "removed" })
        .eq("user_id", user_id);
      await supabaseAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: "876000h",
      });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_users") {
      const { data: { users: authUsers } } =
        await supabaseAdmin.auth.admin.listUsers();
      
      // Get root user IDs to filter them out (unless caller is root)
      let filteredUsers = authUsers || [];
      if (!isRoot) {
        const { data: rootRoles } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .eq("role", "root");
        const rootIds = new Set((rootRoles || []).map((r: any) => r.user_id));
        filteredUsers = filteredUsers.filter((u: any) => !rootIds.has(u.id));
      }
      
      return new Response(JSON.stringify({ users: filteredUsers }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      const { user_id, role } = params;
      // Only root can assign root role
      if (role === "root" && !isRoot) {
        return new Response(JSON.stringify({ error: "Only root can assign root role" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabaseAdmin
        .from("user_roles")
        .update({ role })
        .eq("user_id", user_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "assign_client") {
      const { user_id, client_id } = params;
      const { error } = await supabaseAdmin
        .from("client_assignments")
        .insert({ user_id, client_id, assigned_by: caller.id });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove_client_assignment") {
      const { user_id, client_id } = params;
      await supabaseAdmin
        .from("client_assignments")
        .delete()
        .eq("user_id", user_id)
        .eq("client_id", client_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
