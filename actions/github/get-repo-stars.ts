import axios, { AxiosResponse } from "axios";

export default async function getGithubRepoStars(): Promise<number> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };

    // Only add auth header if token is configured
    if (process.env.NEXT_PUBLIC_GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.NEXT_PUBLIC_GITHUB_TOKEN}`;
    }

    const response: AxiosResponse<any> = await axios.get(
      process.env.NEXT_PUBLIC_GITHUB_REPO_API ||
        "https://api.github.com/repos/pdovhomilja/nextcrm-app",
      { headers }
    );
    return response.data?.stargazers_count ?? 0;
  } catch {
    // Silently return 0 on any error - this is non-critical functionality
    return 0;
  }
}
