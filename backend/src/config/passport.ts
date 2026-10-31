import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { userStore } from '../services/userStore';
import { User } from '../types';

const clientID = process.env.GOOGLE_CLIENT_ID || 'placeholder_client_id';
const clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'placeholder_client_secret';
const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback';

passport.use(
  new GoogleStrategy(
    {
      clientID,
      clientSecret,
      callbackURL,
    },
    async (
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        const email = profile.emails && profile.emails[0]?.value;
        const name =
          profile.displayName ||
          `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() ||
          undefined;
        const avatar = profile.photos && profile.photos[0]?.value;
        const googleId = profile.id;

        let user: User | undefined;

        // Try to find user by email first
        if (email) {
          user = userStore.findByEmail(email);
        }

        // If not found, try by Google ID
        if (!user && googleId) {
          user = userStore.findByGoogleId(googleId);
        }

        if (user) {
          // Fill in name and avatar from Google profile if missing
          const updates: Partial<User> = {};
          if (!user.name && name) updates.name = name;
          if (!user.avatar && avatar) updates.avatar = avatar;
          if (!user.googleId && googleId) updates.googleId = googleId;
          if (!user.email && email) updates.email = email;

          if (Object.keys(updates).length > 0) {
            user = userStore.update(user.id, updates) || user;
          }
        } else {
          // Create new user with Google profile information
          user = userStore.create({
            email,
            name,
            avatar,
            googleId,
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error, undefined);
      }
    }
  )
);

// Serialize & deserialize user handlers required to satisfy Passport types
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser((id: string, done) => {
  const user = userStore.findById(id);
  done(null, user || false);
});

export default passport;
