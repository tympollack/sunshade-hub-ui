import { redirect } from 'next/navigation';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const searchEntries: [string, string][] = [];

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        searchEntries.push([key, value]);
      } else if (Array.isArray(value)) {
        value.forEach((v) => searchEntries.push([key, v]));
      }
    }
  }

  const queryString = new URLSearchParams(searchEntries).toString();

  if (queryString) {
    redirect(`/login?${queryString}`);
  } else {
    redirect('/dashboard');
  }
}
