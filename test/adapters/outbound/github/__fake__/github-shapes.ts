import type { components } from "@octokit/openapi-types";
import type { FakeCommit, FileTable, ModeTable } from "./fake-git-store";

export type ContentFile = components["schemas"]["content-file"];
export type FileCommit = components["schemas"]["file-commit"];
export type GitRef = components["schemas"]["git-ref"];
export type GitTree = components["schemas"]["git-tree"];
export type GitCommit = components["schemas"]["git-commit"];
export type ContentSymlink = components["schemas"]["content-symlink"];
export type ContentSubmodule = components["schemas"]["content-submodule"];
export type GitBlob = components["schemas"]["blob"];
type TreeEntry = GitTree["tree"][number];
type DirectoryItem = components["schemas"]["content-directory"][number];

type Sizes = (blobSha: string) => number;

export interface CommittedFile {
  readonly path: string;
  readonly sha: string;
  readonly size: number;
}

const API = "https://api.github.com";
const WEB = "https://github.com";
const RAW = "https://raw.githubusercontent.com";
const BASE64 = "base64";
const BASE64_LINE_LENGTH = 60;
const LINE_BREAK = "\n";
const FILE_MODE = "100644";
const FOLDER_MODE = "040000";
const SUBMODULE_MODE = "160000";
const SUBMODULE_URL = "https://github.com/fedizko/vendored.git";
const SEPARATOR = "/";
const MAX_INLINE_BYTES = 1024 * 1024;
const NO_ENCODING = "none";
const UTF8 = "utf8";
const HEX_RADIX = 16;
const SHA_LENGTH = 40;
const ZERO = "0";
const BOT = { name: "Fake GitHub", email: "noreply@github.com", date: "2026-11-19T00:00:00Z" };
const UNSIGNED = {
  verified: false,
  reason: "unsigned",
  signature: null,
  payload: null,
  verified_at: null,
};

export class GitHubShapes {
  constructor(
    private readonly owner: string,
    private readonly repo: string,
  ) {}

  contentFile(path: string, sha: string, content: Uint8Array, ref: string): ContentFile {
    const bytes = Buffer.from(content);
    return {
      ...this.locate(path, sha, ref),
      type: "file",
      ...this.encodeFor(bytes),
      size: bytes.length,
    };
  }

  symlink(path: string, sha: string, target: string, ref: string): ContentSymlink {
    const size = Buffer.byteLength(target, UTF8);
    return { ...this.locate(path, sha, ref), type: "symlink", target, size };
  }

  submodule(path: string, sha: string, ref: string): ContentSubmodule {
    const located = { ...this.locate(path, sha, ref), download_url: null };
    return { ...located, type: "submodule", submodule_git_url: SUBMODULE_URL, size: 0 };
  }

  gitBlob(sha: string, content: Uint8Array): GitBlob {
    const bytes = Buffer.from(content);
    return {
      sha,
      node_id: `B_${sha}`,
      url: `${this.api()}/git/blobs/${sha}`,
      size: bytes.length,
      encoding: BASE64,
      content: this.wrapBase64(bytes.toString(BASE64)),
    };
  }

  fileCommit(commit: FakeCommit, branch: string, file?: CommittedFile): FileCommit {
    return {
      content: file ? this.fileSummary(file, branch) : null,
      commit: this.gitCommit(commit),
    };
  }

  gitRef(branch: string, sha: string): GitRef {
    return {
      ref: `refs/heads/${branch}`,
      node_id: `REF_${sha}`,
      url: `${this.api()}/git/refs/heads/${branch}`,
      object: { type: "commit", sha, url: `${this.api()}/git/commits/${sha}` },
    };
  }

  gitCommit(commit: FakeCommit): GitCommit {
    return {
      sha: commit.sha,
      node_id: `C_${commit.sha}`,
      url: `${this.api()}/git/commits/${commit.sha}`,
      html_url: `${this.web()}/commit/${commit.sha}`,
      author: BOT,
      committer: BOT,
      message: commit.message,
      tree: { sha: commit.tree, url: `${this.api()}/git/trees/${commit.tree}` },
      parents: commit.parents.map((sha) => ({
        sha,
        url: `${this.api()}/git/commits/${sha}`,
        html_url: `${this.web()}/commit/${sha}`,
      })),
      verification: UNSIGNED,
    };
  }

  gitTree(sha: string, files: FileTable, sizes: Sizes, modes: ModeTable = new Map()): GitTree {
    const blobs = [...files.entries()].map(([path, blobSha]) =>
      this.blobEntry(path, blobSha, sizes(blobSha), modes.get(path) ?? FILE_MODE),
    );
    const folders = this.foldersOf([...files.keys()]).map((path) => this.folderEntry(path));
    return {
      sha,
      url: `${this.api()}/git/trees/${sha}`,
      truncated: false,
      tree: [...folders, ...blobs].sort((left, right) => left.path.localeCompare(right.path)),
    };
  }

  folderListing(folder: string, files: FileTable, ref: string, sizes: Sizes): DirectoryItem[] {
    const prefix = folder + SEPARATOR;
    const children = [...files.entries()].filter(([path]) => path.startsWith(prefix));
    const direct = children.filter(([path]) => !path.slice(prefix.length).includes(SEPARATOR));
    const subfolders = this.foldersOf(children.map(([path]) => path)).filter(
      (path) => path.startsWith(prefix) && !path.slice(prefix.length).includes(SEPARATOR),
    );
    return [
      ...subfolders.map((path) => this.folderItem(path, ref)),
      ...direct.map(([path, sha]) => this.fileItem(path, sha, ref, sizes(sha))),
    ];
  }

  private fileItem(path: string, sha: string, ref: string, size: number): DirectoryItem {
    return { ...this.locate(path, sha, ref), type: "file", size };
  }

  private folderItem(path: string, ref: string): DirectoryItem {
    const sha = this.folderSha(path);
    return { ...this.locate(path, sha, ref), type: "dir", size: 0, download_url: null };
  }

  private encodeFor(bytes: Buffer): Pick<ContentFile, "encoding" | "content"> {
    if (bytes.length > MAX_INLINE_BYTES) return { encoding: NO_ENCODING, content: "" };
    return { encoding: BASE64, content: this.wrapBase64(bytes.toString(BASE64)) };
  }

  private fileSummary(file: CommittedFile, branch: string): FileCommit["content"] {
    return { ...this.locate(file.path, file.sha, branch), type: "file", size: file.size };
  }

  private locate(path: string, sha: string, ref: string) {
    const self = `${this.api()}/contents/${path}?ref=${ref}`;
    const git = `${this.api()}/git/blobs/${sha}`;
    const html = `${this.web()}/blob/${ref}/${path}`;
    const download = `${RAW}/${this.owner}/${this.repo}/${ref}/${path}`;
    const name = path.split(SEPARATOR).at(-1) ?? path;
    const links = { self, git, html };
    return {
      name,
      path,
      sha,
      url: self,
      git_url: git,
      html_url: html,
      download_url: download,
      _links: links,
    };
  }

  private blobEntry(path: string, sha: string, size: number, mode: string): TreeEntry {
    if (mode === SUBMODULE_MODE) return { path, mode, type: "commit", sha };
    return {
      path,
      mode,
      type: "blob",
      sha,
      size,
      url: `${this.api()}/git/blobs/${sha}`,
    };
  }

  private folderEntry(path: string): TreeEntry {
    const sha = this.folderSha(path);
    return { path, mode: FOLDER_MODE, type: "tree", sha, url: `${this.api()}/git/trees/${sha}` };
  }

  private folderSha(path: string): string {
    return Bun.hash(path).toString(HEX_RADIX).padStart(SHA_LENGTH, ZERO);
  }

  private foldersOf(paths: string[]): string[] {
    const folders = paths.flatMap((path) => this.parentsOf(path));
    return [...new Set(folders)];
  }

  private parentsOf(path: string): string[] {
    const segments = path.split(SEPARATOR).slice(0, -1);
    return segments.map((_segment, index) => segments.slice(0, index + 1).join(SEPARATOR));
  }

  private wrapBase64(encoded: string): string {
    const lines = encoded.match(new RegExp(`.{1,${BASE64_LINE_LENGTH}}`, "g")) ?? [];
    return lines.map((line) => line + LINE_BREAK).join("");
  }

  private api(): string {
    return `${API}/repos/${this.owner}/${this.repo}`;
  }

  private web(): string {
    return `${WEB}/${this.owner}/${this.repo}`;
  }
}
