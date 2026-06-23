import { getAddressBookEntries } from '@/app/actions/operations/address-book';
import AddressBookClient from '@/components/address-book/AddressBookClient';

export default async function AddressBookPage() {
  const result = await getAddressBookEntries();
  return <AddressBookClient initialEntries={result.entries} />;
}
