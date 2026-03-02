import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const testUsers = [
      { email: "tc.test@mfai.com", display_name: "Team Coordinator Test", role: "team_coordinator", client_id: "6d0a1246-7f13-4729-b796-c7d162ec601c" },
      { email: "tp.test@mfai.com", display_name: "Team Participant Test", role: "team_participant", client_id: "b7439b0c-c6c4-42b9-9781-167b2e10dd3d" },
      { email: "cc.test@mfai.com", display_name: "Client Coordinator Test", role: "client_coordinator", client_id: "6d0a1246-7f13-4729-b796-c7d162ec601c" },
      { email: "cp.test@mfai.com", display_name: "Client Participant Test", role: "client_participant", client_id: "b7439b0c-c6c4-42b9-9781-167b2e10dd3d" },
    ];

    const results = [];

    for (const u of testUsers) {
      // Create auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: "TempPass123!",
        email_confirm: true,
        user_metadata: { display_name: u.display_name },
      });

      if (createError) {
        results.push({ email: u.email, error: createError.message });
        continue;
      }

      const userId = newUser.user!.id;

      // The handle_new_user trigger creates profile and default role.
      // Update role to the correct one
      await supabaseAdmin.from("user_roles").update({ role: u.role }).eq("user_id", userId);

      // Also create invitation record
      await supabaseAdmin.from("invitations").insert({
        email: u.email,
        role: u.role,
        client_id: u.client_id,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      });

      // Assign client
      await supabaseAdmin.from("client_assignments").insert({
        user_id: userId,
        client_id: u.client_id,
      });

      results.push({ email: u.email, user_id: userId, success: true });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
