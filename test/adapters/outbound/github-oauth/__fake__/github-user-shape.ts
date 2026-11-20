import type { components } from "@octokit/openapi-types";

type PublicUser = components["schemas"]["public-user"];

const API = "https://api.github.com/users/";
const AVATARS = "https://avatars.githubusercontent.com/u/";
const WEB = "https://github.com/";
const USER_TYPE = "User";
const NODE_PREFIX = "U_kgDO";
const CREATED_AT = "2015-03-01T12:00:00Z";
const UPDATED_AT = "2026-11-01T12:00:00Z";

export interface FakeGitHubUser {
    readonly login: string;
    readonly id: number;
}

export function publicUserShape(user: FakeGitHubUser): PublicUser {
    const api = `${API}${user.login}`;
    return {
        login: user.login,
        id: user.id,
        user_view_type: "public",
        node_id: `${NODE_PREFIX}${user.id}`,
        avatar_url: `${AVATARS}${user.id}?v=4`,
        gravatar_id: "",
        url: api,
        html_url: `${WEB}${user.login}`,
        followers_url: `${api}/followers`,
        following_url: `${api}/following{/other_user}`,
        gists_url: `${api}/gists{/gist_id}`,
        starred_url: `${api}/starred{/owner}{/repo}`,
        subscriptions_url: `${api}/subscriptions`,
        organizations_url: `${api}/orgs`,
        repos_url: `${api}/repos`,
        events_url: `${api}/events{/privacy}`,
        received_events_url: `${api}/received_events`,
        type: USER_TYPE,
        site_admin: false,
        name: null,
        company: null,
        blog: "",
        location: null,
        email: null,
        hireable: null,
        bio: null,
        twitter_username: null,
        public_repos: 0,
        public_gists: 0,
        followers: 0,
        following: 0,
        created_at: CREATED_AT,
        updated_at: UPDATED_AT,
    };
}
