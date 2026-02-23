// public/app.js
(function () {
  // 🔗 Your PocketBase URL
  const PB_URL = "https://pocketbase-production-289f.up.railway.app";
  const pb = new PocketBase(PB_URL);

  const LS_KEYS = {
    PROFILE: "userProfile",
    GROUP: "groupData",
    PREFS: "preferences",
    SOS_EVENTS: "sosEvents",
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
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  function getProfile() {
    return load(LS_KEYS.PROFILE);
  }

  function getGroup() {
    return load(LS_KEYS.GROUP);
  }

  function getPreferences() {
    return load(LS_KEYS.PREFS, {});
  }

  // ---------- PocketBase helpers ----------

  async function upsertProfile(profile) {
    try {
      if (profile.pbId) {
        const updated = await pb.collection("profiles").update(profile.pbId, profile);
        return updated;
      } else {
        const created = await pb.collection("profiles").create(profile);
        profile.pbId = created.id;
        save(LS_KEYS.PROFILE, profile);
        return created;
      }
    } catch (e) {
      console.warn("PB profile error:", e.message);
      return null;
    }
  }

  async function upsertGroup(group) {
    try {
      if (group.pbId) {
        const updated = await pb.collection("groups").update(group.pbId, group);
        return updated;
      } else {
        const created = await pb.collection("groups").create(group);
        group.pbId = created.id;
        save(LS_KEYS.GROUP, group);
        return created;
      }
    } catch (e) {
      console.warn("PB group error:", e.message);
      return null;
    }
  }

  async function savePreferencesPB(profile, prefs) {
    if (!profile || !profile.pbId) return;
    try {
      const list = await pb.collection("preferences").getList(1, 1, {
        filter: `profileId = "${profile.pbId}"`,
      });
      if (list.items.length) {
        await pb.collection("preferences").update(list.items[0].id, {
          profileId: profile.pbId,
          data: prefs,
        });
      } else {
        await pb.collection("preferences").create({
          profileId: profile.pbId,
          data: prefs,
        });
      }
    } catch (e) {
      console.warn("PB prefs error:", e.message);
    }
  }

  async function logSOSEventPB(event) {
    try {
      await pb.collection("sos_events").create(event);
    } catch (e) {
      console.warn("PB SOS error:", e.message);
    }
  }

  async function updateMemberLocationInGroupPB(group, profile, loc) {
    if (!group || !group.pbId) return;
    try {
      const fresh = await pb.collection("groups").getOne(group.pbId);
      const members = fresh.members || [];
      const idx = members.findIndex((m) => m.id === profile.id);
      if (idx >= 0) {
        members[idx].location = loc;
      }
      await pb.collection("groups").update(group.pbId, { members });
    } catch (e) {
      console.warn("PB group location error:", e.message);
    }
  }

  // ---------- Public API functions ----------

  async function createProfile(contact) {
    const profile = {
      id: contact,
      contact,
      name: "",
      avatar: "",
      trustedContacts: [],
      location: null,
      pbId: null,
    };

    save(LS_KEYS.PROFILE, profile);
    await upsertProfile(profile);
    startLocationTracking();
    return { success: true, message: "Profile created" };
  }

  async function saveProfile(partial) {
    const existing = getProfile() || {};
    const updated = {
      ...existing,
      ...partial,
      id: existing.id || partial.contact,
    };
    save(LS_KEYS.PROFILE, updated);
    await upsertProfile(updated);
    return { success: true, message: "Profile saved" };
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
      pbId: existing.pbId || null,
    };

    save(LS_KEYS.GROUP, group);
    await upsertGroup(group);
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
        location: profile.location || null,
      });
    }

    group.members = members;
    save(LS_KEYS.GROUP, group);
    await upsertGroup(group);

    return { success: true, message: "Added to group" };
  }

  async function leaveGroup() {
    const group = getGroup();
    if (!group) {
      save(LS_KEYS.GROUP, null);
      return { success: true, message: "No group to leave" };
    }

    save(LS_KEYS.GROUP, null);
    return { success: true, message: "Left group" };
  }

  async function getInviteLink() {
    const group = getGroup();
    if (!group || !group.id) {
      return { success: false, link: "", message: "No group" };
    }
    const link = `${window.location.origin}/?groupId=${encodeURIComponent(group.id)}`;
    return { success: true, link };
  }

  async function sendSOS(type) {
    const profile = getProfile();
    const group = getGroup();

    if (!profile) return { success: false, message: "No profile" };
    if (!group || !group.id) return { success: false, message: "No active group" };

    const event = {
      type,
      senderId: profile.id,
      groupId: group.id,
      createdAt: new Date().toISOString(),
      location: profile.location || null,
      profilePbId: profile.pbId || null,
      groupPbId: group.pbId || null,
    };

    const sosEvents = load(LS_KEYS.SOS_EVENTS, []);
    sosEvents.push(event);
    save(LS_KEYS.SOS_EVENTS, sosEvents);

    await logSOSEventPB(event);

    return { success: true, message: `SOS sent: ${type.replace(/_/g, " ")}` };
  }

  async function savePreferences(prefs) {
    const profile = getProfile();
    save(LS_KEYS.PREFS, prefs);
    await savePreferencesPB(profile, prefs);
    return { success: true, message: "Preferences saved" };
  }

  function clearAllData() {
    localStorage.clear();
  }

  // ---------- Distance + range helpers ----------

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function distanceFeet(a, b) {
    if (!a || !b) return null;
    const R = 6371000;
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
    if (feet <= 10) return "in_range";
    if (feet <= 30) return "weak";
    return "out_range";
  }

  // ---------- Location tracking ----------

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
        await upsertProfile(updated);

        const group = getGroup();
        if (group && group.id) {
          await updateMemberLocationInGroupPB(group, updated, loc);
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
    if (!profile || !group || !group.pbId) return null;

    try {
      const fresh = await pb.collection("groups").getOne(group.pbId);
      const meLoc = (getProfile() || {}).location || null;
      const members = (fresh.members || []).map((m) => {
        const loc = m.location || null;
        const feet = loc && meLoc ? distanceFeet(meLoc, loc) : null;
        return {
          ...m,
          distanceFeet: feet,
          rangeStatus: rangeStatusFeet(feet),
        };
      });

      const merged = { ...group, ...fresh, members };
      save(LS_KEYS.GROUP, merged);
      return merged;
    } catch (e) {
      console.warn("PB group state error:", e.message);
      return null;
    }
  }

  // ---------- Expose API ----------

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

  if (getProfile()) {
    startLocationTracking();
  }
})();
