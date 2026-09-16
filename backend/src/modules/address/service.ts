import { AddressModel } from "./model";
import { validateObjectId } from "../../utils/security";
import { APIError } from "../../utils/error";

export interface AddressInput {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  province?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export async function getUserAddressesService(userId: string) {
  validateObjectId(userId, "User ID");
  return AddressModel.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
}

export async function createAddressService(userId: string, input: AddressInput) {
  validateObjectId(userId, "User ID");

  if (!input.fullName || !input.phone || !input.street || !input.city) {
    throw APIError.badRequest("Full name, phone, street, and city are required");
  }

  const count = await AddressModel.countDocuments({ userId });
  const isDefault = input.isDefault || count === 0;

  if (isDefault) {
    await AddressModel.updateMany({ userId }, { $set: { isDefault: false } });
  }

  const address = new AddressModel({
    userId,
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    street: input.street.trim(),
    city: input.city.trim(),
    province: input.province?.trim() || "Bagmati Province",
    postalCode: input.postalCode?.trim() || "",
    isDefault,
  });

  await address.save();
  return address;
}

export async function updateAddressService(
  userId: string,
  addressId: string,
  input: Partial<AddressInput>
) {
  validateObjectId(userId, "User ID");
  validateObjectId(addressId, "Address ID");

  const address = await AddressModel.findOne({ _id: addressId, userId });
  if (!address) {
    throw APIError.notFound("Address not found");
  }

  if (input.isDefault) {
    await AddressModel.updateMany({ userId }, { $set: { isDefault: false } });
    address.isDefault = true;
  }

  if (input.fullName !== undefined) address.fullName = input.fullName.trim();
  if (input.phone !== undefined) address.phone = input.phone.trim();
  if (input.street !== undefined) address.street = input.street.trim();
  if (input.city !== undefined) address.city = input.city.trim();
  if (input.province !== undefined) address.province = input.province.trim();
  if (input.postalCode !== undefined) address.postalCode = input.postalCode.trim();

  await address.save();
  return address;
}

export async function setDefaultAddressService(userId: string, addressId: string) {
  validateObjectId(userId, "User ID");
  validateObjectId(addressId, "Address ID");

  const address = await AddressModel.findOne({ _id: addressId, userId });
  if (!address) {
    throw APIError.notFound("Address not found");
  }

  await AddressModel.updateMany({ userId }, { $set: { isDefault: false } });
  address.isDefault = true;
  await address.save();

  return address;
}

export async function deleteAddressService(userId: string, addressId: string) {
  validateObjectId(userId, "User ID");
  validateObjectId(addressId, "Address ID");

  const address = await AddressModel.findOneAndDelete({ _id: addressId, userId });
  if (!address) {
    throw APIError.notFound("Address not found");
  }

  if (address.isDefault) {
    const remaining = await AddressModel.findOne({ userId }).sort({ createdAt: -1 });
    if (remaining) {
      remaining.isDefault = true;
      await remaining.save();
    }
  }

  return { message: "Address deleted successfully" };
}
