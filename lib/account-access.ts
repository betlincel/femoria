export type ProfileRole = "user" | "buyer" | "producer" | "admin";
export type ProfileStatus = "active" | "suspended";
export type SellerVerificationStatus = "pending" | "approved" | "rejected";
export type SellerAccessState = "approved" | "pending" | "rejected" | "suspended" | "none";
export type SellerManagedProductStatus = "draft" | "pending" | "approved" | "rejected";

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

export function isActiveAdminProfile(profile: AccessProfile): boolean {
  return profile.status === "active" && isAdminProfile(profile);
}

export function isStandardUser(profile: AccessProfile): boolean {
  return !isAdminProfile(profile);
}

export function isApprovedSeller(
  profile: AccessProfile,
  sellerProfile: SellerProfile | null | undefined,
): boolean {
  return profile.role !== "admin" && profile.status === "active" && sellerProfile?.verification_status === "approved";
}

export function canApplyAsSeller(
  profile: AccessProfile,
  sellerProfile: SellerProfile | null | undefined,
): boolean {
  return profile.status === "active" && isStandardUser(profile) && !sellerProfile;
}

export function canManageOwnProducts(
  profile: AccessProfile,
  sellerProfile: SellerProfile | null | undefined,
): boolean {
  return isApprovedSeller(profile, sellerProfile);
}

export function getSellerAccessState(
  profile: AccessProfile,
  sellerProfile: SellerProfile | null | undefined,
): SellerAccessState {
  if (profile.role === "admin") return "none";
  if (profile.status !== "active") return "suspended";
  return sellerProfile?.verification_status ?? "none";
}

export function canCreateProduct(
  profile: AccessProfile,
  sellerProfile: SellerProfile | null | undefined,
): boolean {
  return isApprovedSeller(profile, sellerProfile);
}

export function canEditProduct(
  profile: AccessProfile,
  sellerProfile: SellerProfile | null | undefined,
  productStatus: SellerManagedProductStatus,
): boolean {
  return isApprovedSeller(profile, sellerProfile) && ["draft", "rejected"].includes(productStatus);
}

export const canSubmitProductForReview = canEditProduct;
export const canDeleteProduct = canEditProduct;
export const canManageProductImages = canEditProduct;
