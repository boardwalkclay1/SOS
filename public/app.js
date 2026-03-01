(function () {
  const LS_KEYS = {
    PROFILE: "userProfile",
    GROUP: "groupData",
    PREFS: "preferences",
    SOS_EVENTS: "sosEvents",
  };

  // ------------------------------
  // LocalStorage helpers
  // ------------------------------
  function load(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  const getProfile = () => load(LS_KEYS.PROFILE);
  const getGroup = () => load(LS_KEYS.GROUP);
  const getPreferences = () => load(LS_KEYS.PREFS, {});

  // ------------------------------
  // PostgreSQL API helpers
  // ------------------------------

  async function createProfile(contact) {
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact }),
      });

      const data = await res.json();
      if (!data.success) return data;

      const profile = data.profile;
      save(LS_KEYS.PROFILE, profile);

      startLocationTracking();
      return { success: true, message: "Profile created" };
    } catch (e) {
      console.warn("Profile create error:", e.message);
      return { success: false, message: e.message };
    }
  }

  async function saveProfile(partial) {
    const existing = getProfile();
    if (!existing) return { success: false, message: "No profile" };

    const updated = { ...existing, ...partial };
    save(LS_KEYS.PROFILE, updated);

    try {
      const res = await fetch(`/api/profile/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });

      const data = await res.json();
      return data;
    } catch (e) {
      console.warn("Profile save error:", e.message);
      return { success: false, message: e.message };
    }
  }

  async function saveGroup(name) {
    try {
      const res = await fetch("/api/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (!data.success) return data;

      save(LS_KEYS.GROUP, data.group);
      return { success: true, message: "Group saved" };
    } catch (e) {
      console.warn("Group save error:", e.message);
      return { success: false, message: e.message };
    }
  }

  async function addSelfToGroup() {
    const profile = getProfile();
    const group = getGroup();

    if (!profile) return { success: false, message: "No profile" };
    if (!group) return { success: false, message: "No group" };

    try {
      const res = await fetch(`/api/group/${group.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member: profile }),
      });

      const data = await res.json();
      return data;
    } catch (e) {
      console.warn("Join group error:", e.message);
      return { success: false, message: e.message };
    }
  }

  async function leaveGroup() {
    save(LS_KEYS.GROUP, null);
    return { success: true, message: "Left group" };
  }

  async function sendSOS(type) {
    const profile = getProfile();
    const group = getGroup();

    if (!profile) return { success: false, message: "No profile" };
    if (!group) return { success: false, message: "No group" };

    const event = {
      type,
      senderId: profile.id,
      groupId: group.id,
      createdAt: new Date().toISOString(),
      location: profile.location || null,
    };

    const sosEvents = load(LS_KEYS.SOS_EVENTS, []);
    sosEvents.push(event);
    save(LS_KEYS.SOS_EVENTS, sosEvents);

    try {
      await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: group.id,
          userId: profile.id,
          message: type,
          location: profile.location,
        }),
      });

      return { success: true, message: `SOS sent: ${type.replace(/_/g, " ")}` };
    } catch (e) {
      console.warn("SOS error:", e.message);
      return { success: false, message: e.message };
    }
  }

  async function savePreferences(prefs) {
    const profile = getProfile();
    if (!profile) return { success: false, message: "No profile" };

    save(LS_KEYS.PREFS, prefs);

    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: profile.id,
          data: prefs,
        }),
      });

      return await res.json();
    } catch (e) {
      console.warn("Preferences error:", e.message);
      return { success: false, message: e.message };
    }
  }

  // ------------------------------
  // Location tracking
  // ------------------------------
  function startLocationTracking() {
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.watchPosition(
      async (pos) => {
        const profile = getProfile();
        if (!profile) return;

        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          updatedAt: new Date().toISOString(),
        };

        const updated = { ...profile, location: loc };
        save(LS_KEYS.PROFILE, updated);

        await saveProfile({ location: loc });
      },
      (err) => console.warn("Location error", err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }

  // ------------------------------
  // Fetch group state
  // ------------------------------
  async function fetchGroupState() {
    const group = getGroup();
    if (!group) return null;

    try {
      const res = await fetch(`/api/group/${group.id}/state`);
      const data = await res.json();

      if (!data.success) return null;

      save(LS_KEYS.GROUP, data.group);
      return data;
    } catch (e) {
      console.warn("Group state error:", e.message);
      return null;
    }
  }

  // ------------------------------
  // Expose API
  // ------------------------------
  window.App = {
    getProfile,
    createProfile,
    saveProfile,
    getGroup,
    saveGroup,
    addSelfToGroup,
    leaveGroup,
    getInviteLink: () => {
      const group = getGroup();
      if (!group) return { success: false, link: "", message: "No group" };
      return {
        success: true,
        link: `${window.location.origin}/?groupId=${encodeURIComponent(group.id)}`,
      };
    },
    sendSOS,
    getPreferences,
    savePreferences,
    clearAllData: () => localStorage.clear(),
    startLocationTracking,
    fetchGroupState,
  };

  if (getProfile()) {
    startLocationTracking();
  }
})();
