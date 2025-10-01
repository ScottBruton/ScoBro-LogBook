# Supabase Setup Guide for ScoBro Logbook

## 🚀 **Quick Setup**

### 1. **Create Supabase Project**

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login to your account
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - **Name**: `ScoBro-Logbook` (or your preferred name)
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your location
6. Click "Create new project"
7. Wait for the project to be created (2-3 minutes)

### 2. **Get Your Project Credentials**

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

### 3. **Configure Environment Variables**

1. Copy `env.example` to `.env` in your project root:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. **Set Up Database Schema**

**⚠️ Important**: Run these SQL files in order to avoid permission errors:

1. In your Supabase dashboard, go to **SQL Editor**
2. **Step 1**: Copy and run `supabase-schema-part1-tables.sql`
   - This creates all the database tables
3. **Step 2**: Copy and run `supabase-schema-part2-rls.sql`
   - This sets up Row Level Security policies
4. **Step 3**: Copy and run `supabase-schema-part3-functions.sql`
   - This creates functions and triggers
5. **Step 4**: Copy and run `supabase-schema-part4-indexes.sql`
   - This creates performance indexes

**Alternative**: If you prefer to run the original schema:
- Use the original `supabase-schema.sql` but run it as the **postgres** role (not the default role)

### 5. **Enable Authentication**

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Configure your authentication settings:
   - **Site URL**: `http://localhost:1420` (for development)
   - **Redirect URLs**: Add `http://localhost:1420/**`
3. Enable **Email** provider
4. Optionally configure **Email Templates**

### 6. **Test the Connection**

1. Restart your development server:
   ```bash
   npm run tauri
   ```

2. Check the status pills in the app - the **Database** pill should show:
   - 🟡 **Not Signed In** (if not authenticated)
   - 🟢 **Connected** (if authenticated)

## 🔧 **Troubleshooting**

### **Database Pill Shows "Not Configured"**

- Check that your `.env` file exists and has the correct values
- Restart the development server after adding environment variables
- Verify the Supabase URL and anon key are correct

### **Database Pill Shows "Error"**

- Check your internet connection
- Verify your Supabase project is active (not paused)
- Check the Supabase dashboard for any service issues

### **Authentication Not Working**

- Verify the database schema was applied correctly
- Check that email authentication is enabled in Supabase
- Ensure redirect URLs are configured properly

### **Tables Not Created**

- Make sure you ran the complete `supabase-schema.sql` script
- Check the SQL Editor for any error messages
- Verify you have the correct permissions in your Supabase project

### **Permission Error: "permission denied to set parameter app.jwt_secret"**

This error occurs when running the full schema with insufficient permissions. Solutions:

1. **Use the step-by-step approach** (Recommended):
   - Run the 4 separate SQL files in order
   - This avoids permission issues

2. **Run as postgres role**:
   - In SQL Editor, change the role dropdown from default to **postgres**
   - Then run the original `supabase-schema.sql`

3. **Check your project permissions**:
   - Ensure you're the project owner or have admin access
   - Contact your team admin if using a shared project

## 📊 **Database Schema Overview**

The schema creates the following tables:

- **users** - User profiles linked to Supabase auth
- **entries** - Main entry sessions
- **entry_items** - Individual items within entries
- **tags** - Reusable tags for categorization
- **people** - People mentioned in entries
- **jira_refs** - Jira issue references
- **projects** - Project management
- **meetings** - Meeting management
- **meeting_attendees** - Meeting participants
- **meeting_actions** - Action items from meetings

## 🔐 **Security Features**

- **Row Level Security (RLS)** - Users can only access their own data
- **Authentication** - Secure user authentication via Supabase Auth
- **API Keys** - Secure API access with anon and service role keys

## 🚀 **Production Deployment**

For production deployment:

1. Update **Site URL** in Supabase Auth settings to your production domain
2. Add production redirect URLs
3. Consider using **Service Role Key** for admin operations
4. Set up proper **CORS** policies if needed

## 📱 **Mobile/Desktop Sync**

Once configured, your ScoBro Logbook will:
- ✅ Sync entries across all devices
- ✅ Maintain offline functionality
- ✅ Provide real-time updates
- ✅ Secure user data with RLS

---

**Need Help?** Check the [Supabase Documentation](https://supabase.com/docs) or create an issue in the project repository.
