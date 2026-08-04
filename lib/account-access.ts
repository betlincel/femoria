export type ProfileRole = "user" | "buyer" | "producer" | "admin";
export type ProfileStatus = "active" | "suspended";
export type SellerVerificationStatus = "pending" | "approved" | "rejected";

export interface AccessProfile {
  role: ProfileRole;
  status: ProfileStatus;
}

export interface SellerProfile {
  verification_status: SellerVerificationStatus;
}

export function isAdminProfile(profile: AccessProfile): boolean {
  return profile.role === "admin";
}

export function isStandardUser(profile: AccessProfile): boolean {
  return !isAdminProfile(profile);
}

export function isApprovedSeller(
  profile: Pick<AccessProfile, "status">,
  sellerProfile: SellerProfile | null | undefined,
): boolean {
  return profile.status === "active" && sellerProfile?.verification_status === "approved";
}

export function canApplyAsSeller(
  profile: AccessProfile,
  sellerProfile: SellerProfile | null | undefined,
): boolean {
  return profile.status === "active" && isStandardUser(profile) && !sellerProfile;
}

export function canManageOwnProducts(
  profile: Pick<AccessProfile, "status">,
  sellerProfile: SellerProfile | null | undefined,
): boolean {
  return isApprovedSeller(profile, sellerProfile);
}
