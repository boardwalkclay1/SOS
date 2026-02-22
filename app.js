// public/app.js
(function () {
  const API_BASE = ""; // same origin; change if you host API separately

  const LS_KEYS = {
    PROFILE: "userProfile",
    GROUP: "groupData",
    PREFS: "preferences",
  };

  function load(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async function api(path, options = {}) {
    try {
      const res = await fetch(API_BASE + path, {
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        ...options,
      });
      if (!res.ok) throw new Error("API error");
      return await res.json();
    } catch (e) {
      console.warn("API fallback:", e.message);
      return { success: false, offline: true };
    }
  }

  function getProfile() {
    return load(LS_KEYS.PROFILE);
  }

  async function createProfile(contact) {
    const profile = {
      id: contact,
      contact,
      name: "",
      avatar: "",
      trustedContacts: [],
      location: null,
    };

    save(LS_KEYS.PROFILE, profile);

    // Try backend
    await api("/api/profile", {
      method: "POST",
      body: JSON.stringify(profile),
    });

    startLocationTracking();
    return { success: true, message: "Profile created" };
  }

  async function saveProfile(partial) {
    const existing = getProfile() || {};
    const updated = { ...existing, ...partial, id: existing.id || partial.contact };

    save(LS_KEYS.PROFILE, updated);

    await api("/api/profile", {
      method: "POST",
      body: JSON.stringify(updated),
    });

    return { success: true, message: "Profile saved" };
  }

  function getGroup() {
    return load(LS_KEYS.GROUP);
  }

  async function saveGroup(name) {
    const profile = getProfile();
    if (!profile) return { success: false, message: "No profile" };

    const existing = getGroup() || {};
    const group = {
      id: existing.id || `grp_${Date.now()}`,
      name,
      members: existing.members || [],
      createdAt: existing.createdAt || new Date().toISOString(),
    };

    save(LS_KEYS.GROUP, group);

    await api("/api/group", {
      method: "POST",
      body: JSON.stringify(group),
    });

    return { success: true, message: "Group saved" };
  }

  async function addSelfToGroup() {
    const profile = getProfile();
    if (!profile) return { success: false, message: "Set up your profile first." };

    const group = getGroup();
    if (!group || !group.id) return { success: false, message: "Create a group first." };

    const members = group.members || [];
    const already = members.find((m) => m.id === profile.id);
    if (!already) {
      members.push({
        id: profile.id,
        contact: profile.contact,
        name: profile.name || "Me",
      });
    }

    group.members = members;
    save(LS_KEYS.GROUP, group);

    await api(`/api/group/${group.id}/join`, {
      method: "POST",
      body: JSON.stringify({ member: members[members.length - 1] }),
    });

    return { success: true, message: "Added to group" };
  }

  async function leaveGroup() {
    const group = getGroup();
    if (!group) return { success: true, message: "No group to leave" };

    save(LS_KEYS.GROUP, null);
    localStorage.removeItem(LS_KEYS.GROUP);

    // Optional: notify backend
    await api(`/api/group/${group.id}/leave`, { method: "POST" });

    return { success: true, message: "Left group" };
  }

  async function getInviteLink() {
    const group = getGroup();
    if (!group || !group.id) {
      return { success: false, link: "", message: "No group" };
    }
    // For now, just a placeholder link; later can be deep link
    const link = `${window.location.origin}/?groupId=${encodeURIComponent(group.id)}`;
    return { success: true, link };
  }

  async function sendSOS(type) {
    const profile = getProfile();
    const group = getGroup();

    if (!profile) return { success: false, message: "No profile" };
    if (!group || !group.id) return { success: false, message: "No active group" };

    const event = {
      id: Date.now(),
      type,
      senderId: profile.id,
      groupId: group.id,
      createdAt: new Date().toISOString(),
      location: profile.location || null,
    };

    // Local log
    const sosEvents = load("sosEvents", []);
    sosEvents.push(event);
    save("sosEvents", sosEvents);

    // Backend broadcast
    await api("/api/sos", {
      method: "POST",
      body: JSON.stringify(event),
    });

    return { success: true, message: `SOS sent: ${type.replace(/_/g, " ")}` };
  }

  function getPreferences() {
    return load(LS_KEYS.PREFS, {});
  }

  async function savePreferences(prefs) {
    save(LS_KEYS.PREFS, prefs);
    await api("/api/preferences", {
      method: "POST",
      body: JSON.stringify(prefs),
    });
    return { success: true, message: "Preferences saved" };
  }

  function clearAllData() {
    localStorage.clear();
  }

  // Distance helpers
  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function distanceFeet(a, b) {
    if (!a || !b) return null;
    const R = 6371000; // meters
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);

    const c =
      2 *
      Math.atan2(
        Math.sqrt(
          sinDLat * sinDLat +
            Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
        ),
        Math.sqrt(
          1 -
            (sinDLat * sinDLat +
              Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng)
        )
      );

    const meters = R * c;
    return meters * 3.28084;
  }

  function rangeStatusFeet(feet) {
    if (feet == null) return "out_range";
    if (feet <= 10) return "in_range"; // green
    if (feet <= 30) return "weak"; // blue
    return "out_range"; // red
  }

  // Location tracking
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

        const group = getGroup();
        if (group && group.id) {
          await api("/api/location", {
            method: "POST",
            body: JSON.stringify({
              groupId: group.id,
              userId: profile.id,
              location: loc,
            }),
          });
        }
      },
      (err) => {
        console.warn("Location error", err);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }

  async function fetchGroupState() {
    const profile = getProfile();
    const group = getGroup();
    if (!profile || !group || !group.id) return null;

    const res = await api(`/api/group/${group.id}/state`);
    if (res.offline || !res.success) {
      // Local-only fallback
      const localGroup = getGroup();
      const meLoc = (getProfile() || {}).location || null;
      const members = (localGroup.members || []).map((m) => {
        const loc = m.location || null;
        const feet = loc && meLoc ? distanceFeet(meLoc, loc) : null;
        return {
          ...m,
          distanceFeet: feet,
          rangeStatus: rangeStatusFeet(feet),
        };
      });
      return { ...localGroup, members };
    }

    const meLoc = (getProfile() || {}).location || null;
    const members = (res.group.members || []).map((m) => {
      const loc = m.location || null;
      const feet = loc && meLoc ? distanceFeet(meLoc, loc) : null;
      return {
        ...m,
        distanceFeet: feet,
        rangeStatus: rangeStatusFeet(feet),
      };
    });

    const merged = { ...group, ...res.group, members };
    save(LS_KEYS.GROUP, merged);
    return merged;
  }

  // Expose API
  window.App = {
    getProfile,
    createProfile,
    saveProfile,
    getGroup,
    saveGroup,
    addSelfToGroup,
    leaveGroup,
    getInviteLink,
    sendSOS,
    getPreferences,
    savePreferences,
    clearAllData,
    startLocationTracking,
    fetchGroupState,
  };

  // Auto-start tracking if profile exists
  if (getProfile()) {
    startLocationTracking();
  }
})();
