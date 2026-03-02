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

    // Verify requesting user is admin
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

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();

    if (action === "invite") {
      const { email, role, client_id, display_name } = params;

      // Create invitation record
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

      // Create the auth user with a temporary password
      const tempPassword = params.temp_password || "TempPass123!";
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { display_name: display_name || email },
        });

      if (createError) {
        // Clean up invitation if user creation failed
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
      // Update profile status
      await supabaseAdmin
        .from("profiles")
        .update({ status: "paused" })
        .eq("user_id", user_id);
      // Ban user in auth
      await supabaseAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: "876000h", // ~100 years
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
      // Get auth users for last_sign_in info
      const { data: { users: authUsers } } =
        await supabaseAdmin.auth.admin.listUsers();
      return new Response(JSON.stringify({ users: authUsers }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      const { user_id, role } = params;
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
