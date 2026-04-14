import type {
  Listing,
  Feature,
  Neighborhood,
  Testimonial,
  NavItem,
  FooterLink,
  HowItWorksStep,
  PropertyDetail,
  Agency,
  University,
  AgencyDetail,
  BlogPost,
  PopularPost,
  SharedHousingDetail,
  ProjectDetail,
  AnalyticsStat,
  DashboardMessage,
  UserProfile,
  LikedProperty,
  InboxContact,
  ChatMessage,
  BlogArticle,
  RelatedArticle,
} from "@/types";

export const NAV_ITEMS: NavItem[] = [
  { label: "Find Homes", href: "/find-homes" },
  { label: "Shared Housing", href: "/find-homes?category=shared_housing" },
  { label: "Agencies", href: "/agencies" },
  { label: "Blog", href: "/blog" },
  { label: "About Us", href: "/about" },
];

export const FEATURES: Feature[] = [
  {
    icon: "Sparkles",
    title: "AI-Powered Matching",
    description:
      "Find roommates and homes that truly match your lifestyle and vibe using our proprietary algorithm.",
  },
  {
    icon: "BadgeCheck",
    title: "Verified Profiles",
    description:
      "Safety first. All users go through our rigorous verification process including ID checks.",
  },
  {
    icon: "Store",
    title: "Quality Listings",
    description:
      "Curated properties that meet our high quality standards for comfort, location and price.",
  },
];

export const LISTINGS: Listing[] = [
  {
    id: "1",
    title: "Artistic Mission Loft",
    location: "Mission District, SF",
    price: 1600,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDIgpp5RaTRHgduce7EJNsecsSIvCfIcE7G8b-6UddfNkO6SwIluzJzuD2vJmVzf3P7SEtFr3eebmTH2GhU6sJsLqBW_M9k_4uTUnuTcUmFNHFCzhSCMmbR_prcpFUYDpGogXf0qXYQepi1KPrv2JveaYiKsNkY6GrgUSymxhAv7YKbYU_HvNVVGlWj95qcgr9co8da1CQsoOLdknAR6fT3a8vd4pGCTqv8z9tuHSTFB-nf9uqyqKm3Yvm0r8E-eRc_lYNvjZvL7Dqq",
    matchPercent: 94,
    verified: true,
    filledSpots: 2,
    totalSpots: 3,
    tags: ["#Creative", "#LGBTQ+", "#CatFriendly"],
    avatars: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB_4SvcWoGcNeLbmGkFWtvLLLbuDgZVAW1Vt0-MKRFxdPra44gHP1PGCvcdXlhWwgw49mX4x7YJaxJgkWwuw8J4g4zg_2lo8oRD90_zfTxebHh2iBxiJqMNehmKdDXP5r2pLHRFJ3kUmSLSjv21iDfPwCvoZBYSZ4-FLbYcaHclTWDCUSUeE-IbmSSqwbA2GdcVePVfZ-V39KGMmMiQRHot8o1UtZKxDkr0k6VtFsdgGpFqmRNltwxE5nB6Z7PCKiFkiPJ5G5S-ld--",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB8KUOAL3u6PswIAARf0htA4tctE7bSMyWrXvwbtY_y9Pu-rHiu6tN5q7u2yZaYxMRyNO4jVMnGTpDWeSXd__NcDPcywTYvNGTBEI7Yq4-gQ6cyD8nmFcS2-gbF2njPXqzBCrKtlfNmOb2RMvnX5YeuOI6cRIf4tEp0Z13u-G7amof58KrkAhOxu5J4DfHrVqqISuwG6FonC-w9Gl8YYaips4NfGRSMTrPLemnkCVZheRluX4GbS8ZKP0B2FzG4dauK55Og5moZaTAB",
    ],
    liked: true,
  },
  {
    id: "2",
    title: "Quiet Study Hub",
    location: "Berkeley Hills, CA",
    price: 1250,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBibdq75F1VTpKHQtvVZZwBvVl3R1E9pSbyET56uJKdzajSf9cOjRXTF9Wz9ZzE9ddO_eTDjp-yIQes4meJbG6FBtGUqNn-tiH2FMhwP6_HPIxcfVIBRrL-OA7ew46dttyWX-FZ9TwDEFS1-7MFT_LQbUbRmYdsai4BWEJlh3PVNb0REHIdcyg3-TpiQazIw10LwSxeyWrrBvxgnkhTYqvBvn2sFlnlBAc_r-kyHJK-s_ym8zTi9noH39hUeHAb2Dh0NICKgM_mX00Q",
    matchPercent: 88,
    verified: true,
    filledSpots: 1,
    totalSpots: 4,
    tags: ["#Students", "#Quiet", "#Vegan"],
    avatars: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD0AJ5-qxk8p4dqmgd8TjbHeyqIlRYNfVwxf0w524lEs6Uf2-XWCO8OETcjoyBEhARkAZUZiXa0im_MhMNF52h_6PFZuKBhOu3BBOyx_hB666ganCV5bq3aAs9Tq8UOyVGdueksE138K8ABYqC3uy7PnuWN2SOTuqDvtJnRdOkCzAJ5a_wGc2YfjCQVDPxXuA_uXT9XOUDo43DUTmia6O7NYV2aD_-4xPTkpJlnulGt5s5PYK92sF-6VdDto8HI5H1nRQlbXTVstV5J",
    ],
    liked: false,
  },
  {
    id: "3",
    title: "Tech Founder House",
    location: "SOMA, SF",
    price: 2100,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA3NBcgn5tNDlZemxp_zFAydpReYVPOG93ZwywoFZhhDT4gXhh4ocsOMgtJZVaHLmYVRIoPTVZIBCd58xRlR-hl5ocQTg8qoqWSiBiTuBB90XWU0a7fOP368BMyQfWX7AxKDAu0ShxBUPWJujYjbGxjXlQCkKrvBWaxS7UuCncMK0aSBObBA6jkCrNAlYF76PXke1CPRoL299b1y4NILgsz06UQLfip3OX4E2d_K4RmPhL2NzXjxuzprNNhDE7lJEjLmcXaWHt5fT5v",
    matchPercent: 75,
    verified: false,
    filledSpots: 3,
    totalSpots: 5,
    tags: ["#StartupLife", "#Gym", "#Networking"],
    avatars: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDahSqwHuUwpGgeqZjJvepifTLfPOsU72PmnzYthgNkIr820Wv3e4wqu884PZ_MUvtCOsz7bZCfZd6gNme246VRdOr_GW0Rmpx77TLABQU24B43YYi61a_XpeUiWEi2cHjJAgGmDguzpeLf6yS9oUuWCiSEXcqdhRE6Hsff_Za1zDdc7uZ3TXO8qF0jwc2pdd5UuafW1zBvUBuVk9tHz090Kz_nJdb7kUSskdPt-YRQ5OHav7iLgDlR21i39OXHYtzD43EcYYQ8Vi4d",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC1HzwOVKZPepQM-1pcDnfmsNFD3Jx68TSpQXBX0Yvqpi8Kwt2zxaE97P6sMLnBVaSALxFq8fCueGhnvTyx3y-qRB1SPhSp89j7gqj3niyPBxbhcb9Nb5pBHLBxnK76kUi-qddy4hwjzfpZtdcY-djGRPOB_tsoecc5TmprwAktHtTuC8M0sf6sPSUN-OIKfLEqPJq294XgLNqS6bGcxnhjOpDnBWt-YO2Tp7MDA0o0Z7llkZbarKOCYIQUPAIVmBgMUoHvbSt1bPH2",
    ],
    liked: false,
  },
];

export const NEIGHBORHOODS: Neighborhood[] = [
  {
    name: "New York",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCa0fy98t2PE0mzURm78ZcUB19Dxx-6i5y5L8ZoKj4xjXf54-xtPNemSEp1P7z8nHfaFIok9w7iE9m3xXPbuSNTmQaAVouVmLf8Bdbr-9PWR3DMAIqv590wXmphqQGuN6gGo66YRQ4WenHi9hM5k5CPX3zgiunyF1kVokyriOznJZpf8iUcLjciW0PT5NnPpFDFVyw_HlMzQ_YcKu4FdbTezBShp2uUQTOh9cPerlRFAVq0YmcJmoIAssiwMXT-AAWp5MzjccuRMZ8u",
    listingCount: 45,
    href: "/find-homes?city=new-york",
  },
  {
    name: "San Francisco",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAyS8GwZYivZ5vtVghreVcZA9DkKpdZmBW2L4V7NRQYF-igOveMapP-k-n2KhEG4mGGgxUbj5Dm6NM558oqkHUmg0rhT_i4_T4wm-c0c1VklA-bzg5gJSB3JQLK_CHLrNed_jMnnNF3Xj-lLwhEeTFMomkWgaxh7TWafj6W4Y_9jHBlxoje5jDI7Dh2pzPprbyoPwtQ9XcEojHGPjdYw9eJuhWNq8GnehqMhfyFea7f53sD7mJxWOQPke8giuetzjmxnyrF--PEIyP9",
    listingCount: 32,
    href: "/find-homes?city=san-francisco",
  },
  {
    name: "Austin",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBE4RHfV7QXDXgpKg3yRTNhHhzG1zZzxPYWmKiS5RTtMYREhE4uUpsvUJRO8x8nAhekxVi-6N5Q_71kQ0pvdJi-YvC9uD6xK7RmQv2m08cyuJ_a5LY_FoFriwzVHrDvWe4s6YL4WSE7QAw9exxXZiD5vaHFES6495OgztTo2h335ODEqZ8K0k6hTQZSFXCvYOFsQuHje9mk5seD2KMO9br2yIoT6_eaONJrncYEG0halQzZQR0SLd8JN63mh9XFvM3I0RAvV5IivyWU",
    listingCount: 28,
    href: "/find-homes?city=austin",
  },
  {
    name: "London",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAkeB9qq9tw8Lcy9mNQgWhonawRecIqRPNuyMMECfPmjsaUY4xQ4I5GFQ3aBNHT7RC8eDvvDWvVC7bfQQ1qqJDvKHLRpOFz4v5txJJHe217E_DqhSr6s_O91qrBhj1Wa6YRM3BsvdXRoZFx1piJplzHrbXCyCttggvC7IoeuaKGlrC6k0QZzWIux5oSTwplQ3nueDTNhpTdoIFmVY0f3D3pnjiakw7vTGVuf46DRg8AaTFY8BEKhfsWyKS3n2JJIrC-3mFg179Dl5ld",
    listingCount: 50,
    href: "/find-homes?city=london",
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    name: "Sarah Jenkins",
    subtitle: "Moved into The Mission Loft",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDP9htRA-NqUYvVw7A1ZbiJNNdEBy7s5kluqVzKpHu5Clf7wLxzaRhd_4yIzEZRTlEa8x34GStStdDUCPrUMhhS70hIrIcw2vgy_Ld0UKMCHEaps6_bZgvkJNYuQ_I7f_-PMQSSuahE-mdS0DIneumTpHxG70UlfkaLKrzvDoLrwn6K0BBt7mQtCe05qlLw7bvdHXDmcMHmMwDPYKeEBugJw7FQl1CKM2WKUYpN0EO9n3MT0s69wMnX7QWwShmO03yLwqO9QQtxaZ7n",
    rating: 5,
    quote:
      "I was skeptical about AI matching, but my roommates are literally my best friends now. The vibe check feature is shockingly accurate.",
  },
  {
    id: "2",
    name: "Marcus Chen",
    subtitle: "Host in NYC",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAGtYyx572Zsr52Kr1wck-92jc8G0126eZkP6VM8ismYxCj5tW-5H9PZ82txdmY7s4K3Hkxy5dVSmoosi6j_OtMocfZUZ2Wstmswr0Qh-QFdNXQQp5wrliXQN_YEgvqJeNIG-sieHP0y9OSuyzN8tmlAR9ot5qkjHrMmLVE-gaJakLIfLdydMO5cYId_WhLwbcxia2zVTa0wLyjaTAyd8AnIDR1BrYq5-FkoIcG3bSX8i2rLhF5EzsodOeNregbbXIkIm8d8zWhNGUf",
    rating: 5,
    quote:
      "Finding quality tenants used to be a nightmare. Axiom verified profiles gave me peace of mind instantly. Highly recommended.",
  },
  {
    id: "3",
    name: "Elena Rodriguez",
    subtitle: "Renting in Austin",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD9dVkaS4zjKTsaQDVypFOhzpmOAHtFHHMnx55zq4VhbBlkfAh0SnpHZssRMwlZetPk8-mItqowdyLYF3seuuK0lnFS9T8ct3jQSUP7f9iX5S8KVflGbqX7M5ReX5evaymuADNSZg9Sek77gohJcmW6Wf8lnvyBcUU0_mpukWd7O99kitNKwRWFGO6A-4VBOOjzZ63R5ic1RzqAjYU34TTJeoRtp70fdtX65-NYRphe5F6MRddeAjx0c7-oTe2ZG2eC2wqxQWJEnfO7",
    rating: 4.5,
    quote:
      "The interface is so smooth and the filters actually work. Found a place within 3 days of signing up. Smooth sailing!",
  },
];

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    number: "01",
    title: "Create Profile",
    description:
      "Share your lifestyle, habits, and what you're looking for. Our AI analyzes your vibe.",
  },
  {
    number: "02",
    title: "Get Matched",
    description:
      "We suggest homes and roommates with high compatibility scores. No more guessing games.",
  },
  {
    number: "03",
    title: "Connect & Move",
    description:
      "Chat securely, schedule tours, and sign leases all within the platform. Welcome home.",
  },
];

export const QUICK_LINKS: FooterLink[] = [
  { label: "Home", href: "/" },
  { label: "Search Listings", href: "/find-homes" },
  { label: "Agencies", href: "/agencies" },
  { label: "About Us", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export const LEGAL_LINKS: FooterLink[] = [
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Cookie Policy", href: "/cookies" },
  { label: "Fraud Prevention", href: "/fraud-prevention" },
];

export const PRESS_LOGOS = [
  { name: "THE NEW YORK TIMES", className: "font-serif" },
  { name: "FORBES", className: "font-serif" },
  { name: "TechCrunch", className: "tracking-tight" },
  { name: "WIRED", className: "font-mono" },
  { name: "Vogue", className: "font-serif italic" },
];

export const SEARCH_LISTINGS: Listing[] = [
  ...LISTINGS,
  {
    id: "4",
    title: "Hayes Valley Modern",
    location: "Hayes Valley, SF",
    price: 1950,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCd9Ldp_5Pku0t9yWgSEaoWULuFjK3VekL8deJvqCYQEZWgMaV-f-9M5e5J9c5zMbdjOCZpUCRhrSi3Uw6Rr8O5ftjWlMK2YfPOQUBhRmTP8qREUtswyu6VKQAFz1d6CZJcNRHUM9SjY5dAn9eJ71haMSItriTezzSHqM8oz69U2lopFjZWNHPt_Cv_X6RrM-ep6Lhbkokod3-YKj2Vi43NvLnFjEUHhzBF62-epQIE08mI_USP30_mdQdXBzZrwyGutTXA9sUyCbxU",
    matchPercent: 91,
    verified: true,
    filledSpots: 1,
    totalSpots: 2,
    tags: ["#Social", "#Design"],
    avatars: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDP9htRA-NqUYvVw7A1ZbiJNNdEBy7s5kluqVzKpHu5Clf7wLxzaRhd_4yIzEZRTlEa8x34GStStdDUCPrUMhhS70hIrIcw2vgy_Ld0UKMCHEaps6_bZgvkJNYuQ_I7f_-PMQSSuahE-mdS0DIneumTpHxG70UlfkaLKrzvDoLrwn6K0BBt7mQtCe05qlLw7bvdHXDmcMHmMwDPYKeEBugJw7FQl1CKM2WKUYpN0EO9n3MT0s69wMnX7QWwShmO03yLwqO9QQtxaZ7n",
    ],
    liked: false,
  },
];

export const AGENCIES: Agency[] = [
  {
    name: "Emaar Misr",
    subtitle: "Premium Developer",
    logo: "https://lh3.googleusercontent.com/aida-public/AB6AXuBumw6lAGggH7DHD_FLgnoRaX0mYhdN5irB86UZDza7C_sqaI8bYzCJR6ceE57hiM5-i7jJb5BWS3H9tCZT0G0whF-9aZdzKJuZruB6yWb35TdEjJT9m89WXSXQNS6os2lBwPqHGFHPyH4cEYc7z3Y3qs5aGVbW7dy1oVjb5QnqqRBoWO3eQB_Lk1zzV-qEJXuP7CDCL_FW_6uVq42wjkd1PIoNG-h_uydw7mf3YUwA5BX3Ket5a23sziGbo2H67JA9Mvxldp_1D6yv",
    description:
      "Pioneering luxury lifestyles and vibrant communities that redefine modern living standards across the region.",
    activeProjects: "12",
    listings: "150+",
  },
  {
    name: "SODIC",
    subtitle: "Real Estate",
    logo: "https://lh3.googleusercontent.com/aida-public/AB6AXuCTtR5WrDPIc6P08fHmEOmmQ-_bPUvkCEnWzFBnnVA1NitUBt30VBEMja0WhnaZkhztgx4jhquYNqFn5geJ3kEfGPwj3q1e6TaDkzH11iePwmyfL8iZCau2yQSUZzIDWFQ_ascjK1c-NtMc5QM6fXVftW-WL3gFII9UiFE3rKd9wPEGEVD1serwwRQOsHJ9Ak3wgFLiQoyrBd5sK0OmR-WJGeuxncY5bPvOxNzlLgccfJfgMB-bWHB_8obAAnOgCT0SJf3Odoh0HlVo",
    description:
      "Creating award-winning residential, commercial, and retail developments in Egypt's finest locations.",
    activeProjects: "8",
    listings: "85",
  },
  {
    name: "Mountain View",
    subtitle: "Community Living",
    logoText: "MV",
    logoFont: "font-serif",
    description:
      "Delivering a life of happiness through innovative design and world-class integrated communities.",
    activeProjects: "15",
    listings: "210+",
  },
  {
    name: "Palm Hills",
    subtitle: "Developments",
    logoText: "PH",
    logoFont: "font-sans",
    description:
      "A leading real estate company in the Egyptian market, primarily developing integrated residential communities.",
    activeProjects: "10",
    listings: "120+",
  },
  {
    name: "Ora Developers",
    subtitle: "Luxury Living",
    logoText: "ORA",
    logoFont: "font-mono",
    description:
      "Bringing a new dimension to modern living with projects that blend exceptional lifestyle and design.",
    activeProjects: "4",
    listings: "45",
  },
  {
    name: "Talaat Moustafa",
    subtitle: "Urban Development",
    logoText: "TMG",
    logoFont: "font-sans",
    description:
      "The largest listed real estate developer in Egypt, creating fully integrated cities and communities.",
    activeProjects: "6",
    listings: "300+",
  },
];

export const UNIVERSITIES: University[] = [
  {
    name: "American University",
    shortName: "AUC",
    location: "New Cairo, Egypt",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuARLGkALt6DAC_sxnRmkpdFMnlL0Ci2p5HMdAK5d4C2e4uPUvxiuNprZpPpON91YKVb7qyvjQi8Ts45O5rMBa9sUKqUQn1fi7vCTLr38UNa7O7VpE-ki3IP3xYPMhXRSoU4fvh1q0Jz8JIZik9sPV5DcyIvhQhUoSPqsGHlcimMUI7n9Jf6suvZTUOCelcv6OEyYbA04oJ6DT9MKb9AS_6pp0TviIA_zQiVb_iIA5dyW3SUA_xG80N9tD2knpFFjhYtnax2_44HPz5k",
    availability: "available",
    details: [
      { label: "Dorms", value: "On-Campus" },
      { label: "Private Rooms", value: "Yes" },
    ],
    avgPrice: "$350/mo",
  },
  {
    name: "German University",
    shortName: "GUC",
    location: "New Cairo, Egypt",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBU9gJGV7yQlbWDWleSOzAYdxe0_RUuckYr_J1RM__tYIh90sfvWBYjrks4z-MGN8ICN7uQ-NOENV0iDdVYjfy9E-rV8YV_P2P0DCR6UqErfn0ZAgBeXgJ39ACE7edH5iCBZBu4WTEtPh-YVmhANEU3DRL-2im6pHPoxRLixeQb4Jsut1LKoh1j1bw0URp7CvOaLEtLCWg1Gs5OEPfW1zzyPIXLRsPuYkFiXo5MTvHKfbUOhssF7A9myiQZzFFI-Z90JyFJ8-UTPG8V",
    availability: "available",
    details: [
      { label: "Dorms", value: "Off-Campus" },
      { label: "Shared Apts", value: "Yes" },
    ],
    avgPrice: "$280/mo",
  },
  {
    name: "British University",
    shortName: "BUE",
    location: "El Shorouk, Egypt",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD_3JqYDqWDJt7x8T06uWm7sn7p0PMAbI7_zfTSeS3tmqZ1i0X1qGKHT5ZKBcp-CShJnLqn3OSgWWlB3ItRNGugxiyLFhxfz9fjRWwXqnpl5SVAqBy4WaCz3a31VAXcl77SCvyb8G2dfBlCLUslz8-1EI51EWcMgkGTeW5dw3R2PKXW3VtdslD4p52QhW42F9gegMF7WKu2ETSw4o3UYoHp8IK3Z741jmd4OzStUZL2S7h0RN6HSv3mN6HjyFxkvNPLK6G45n5Nexxn",
    availability: "limited",
    details: [
      { label: "Dorms", value: "On-Campus" },
      { label: "Bus Service", value: "Included" },
    ],
    avgPrice: "$320/mo",
  },
  {
    name: "Ain Shams Univ.",
    shortName: "ASU",
    location: "Cairo, Egypt",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBW59XzE5x6pL3O5AHToRjddgLDrSSeerXCZfckAMKpo4KsBUNw_wzgl0EFSm7POEWcB1QUlN_szD5bRTlgHr2cl1Fk7dFS_QB1coWR5u_2H7r9nfCBRkM84e8fVfasWs2ZVU_mg0IZzpGMTWNwEf2iIfFl2qCn0kUwitFln3qfvCMALXJrrQEAER3ML3brkDUuVbyvJMYCmFj5XNOlLhdmSNxvnqaXdaURmzM51wvvP1Q9zyH1IspBtCNCvOLWkzt0oBX9nro5S8iW",
    availability: "available",
    details: [
      { label: "Dorms", value: "External" },
      { label: "Metro Access", value: "Yes" },
    ],
    avgPrice: "$150/mo",
  },
];

const LISTING_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDIgpp5RaTRHgduce7EJNsecsSIvCfIcE7G8b-6UddfNkO6SwIluzJzuD2vJmVzf3P7SEtFr3eebmTH2GhU6sJsLqBW_M9k_4uTUnuTcUmFNHFCzhSCMmbR_prcpFUYDpGogXf0qXYQepi1KPrv2JveaYiKsNkY6GrgUSymxhAv7YKbYU_HvNVVGlWj95qcgr9co8da1CQsoOLdknAR6fT3a8vd4pGCTqv8z9tuHSTFB-nf9uqyqKm3Yvm0r8E-eRc_lYNvjZvL7Dqq";

export const PROPERTY_DETAIL: PropertyDetail = {
  id: "1",
  ownerId: "broker1",
  title: "Artistic Mission Loft",
  location: "Mission District, SF",
  fullAddress: "Mission District, San Francisco, CA",
  price: 1600,
  rating: 4.9,
  reviewCount: 12,
  verified: true,
  isNew: true,
  available: true,
  images: [LISTING_IMAGE, LISTING_IMAGE, LISTING_IMAGE],
  type: "Loft Apartment",
  size: "1,250 Sq Ft",
  bedrooms: "2 Beds",
  bathrooms: "2 Baths",
  description: [
    "Experience the quintessential Mission District lifestyle in this stunningly renovated industrial loft. Originally a 1920s warehouse, this space has been reimagined for modern creative living while preserving its authentic architectural soul. Soaring 16-foot ceilings with exposed timber beams and ductwork create an airy, expansive atmosphere that is flooded with natural light from the floor-to-ceiling steel-casement windows.",
    "The open-concept living area flows seamlessly into a chef's kitchen featuring honed concrete countertops, custom walnut cabinetry, and top-of-the-line Viking appliances. Polished concrete floors with radiant heating run throughout the main level, adding both style and comfort.",
    "Ascend the floating steel staircase to the mezzanine master suite, a private retreat overlooking the living space below. It features a walk-in closet with custom organizers and a spa-inspired bathroom with a rain shower and soaking tub. A second enclosed bedroom on the main floor serves perfectly as a guest room or home office. Located just steps from Valencia Street's vibrant dining and shopping scene.",
  ],
  amenities: [
    { icon: "Wifi", label: "Gigabit WiFi" },
    { icon: "Snowflake", label: "Central AC" },
    { icon: "WashingMachine", label: "In-unit Laundry" },
    { icon: "Dumbbell", label: "Private Gym" },
    { icon: "Fence", label: "Rooftop Deck" },
    { icon: "PawPrint", label: "Pet Friendly" },
    { icon: "Car", label: "Garage Parking" },
    { icon: "ShieldCheck", label: "24/7 Security" },
    { icon: "CookingPot", label: "Dishwasher" },
  ],
  similarProperties: [
    {
      id: "s1",
      title: "Industrial Warehouse Loft",
      location: "SoMa, San Francisco",
      price: 1850,
      image: LISTING_IMAGE,
    },
    {
      id: "s2",
      title: "Modern Concrete Studio",
      location: "Dogpatch, San Francisco",
      price: 1400,
      image: LISTING_IMAGE,
    },
    {
      id: "s3",
      title: "Victorian Creative Space",
      location: "Haight-Ashbury, SF",
      price: 2100,
      image: LISTING_IMAGE,
    },
  ],
};

export const AGENCY_DETAIL: AgencyDetail = {
  slug: "vanguard-estates",
  name: "Vanguard Estates",
  logoText: "VE",
  badge: "Premier Developer",
  location: "Global Headquarters: New York, NY",
  bannerImage: LISTING_IMAGE,
  description:
    "Crafting skyline-defining residences since 2008. We merge architectural innovation with sustainable luxury to create freehold assets that inspire ownership.",
  trustScore: "99.8",
  projectsForSale: "124",
  developmentHistory: "15 Years",
  awards: [
    {
      title: "Architectural Digest 2023",
      subtitle: "Best New Condo Development",
      gold: true,
    },
    {
      title: "Sustainable Living Award",
      subtitle: "Green Building Council",
      gold: false,
    },
  ],
  featuredProjects: [
    {
      id: "fp1",
      title: "The Obsidian Tower",
      location: "Downtown Financial District",
      image: LISTING_IMAGE,
      price: "$850k+",
      priceLabel: "Purchase Price",
      beds: "1-3 Beds",
      area: "600-2400 sqft",
      status: "Under Construction",
      statusColor: "bg-black/60",
      progressPercent: 75,
      progressColor: "bg-primary",
      progressLabel: "75% Sold Out",
      completionLabel: "Completion: Q4 2024",
      cta: "View Sales Brochure",
      badge: "For Sale",
      badgeColor: "bg-primary",
    },
    {
      id: "fp2",
      title: "Heritage Lofts",
      location: "Historic District",
      image: LISTING_IMAGE,
      price: "Register",
      priceLabel: "Sales opening soon",
      beds: "Studio-2 Beds",
      area: "800-1600 sqft",
      status: "Pre-Launch Sales",
      statusColor: "bg-blue-600/90",
      progressPercent: 15,
      progressColor: "bg-blue-500",
      progressLabel: "ROI Potential: High",
      completionLabel: "Launch: Q2 2025",
      cta: "Join Waitlist",
    },
  ],
  topListings: [
    {
      id: "tl1",
      title: "Azure Waterfront",
      location: "North Bay Marina",
      image: LISTING_IMAGE,
      price: "$1.2M+",
      priceLabel: "Starting from",
      beds: "2-4 Beds",
      area: "1200-3500 sqft",
      status: "Immediate Occupancy",
      statusColor: "bg-green-600/90",
      progressPercent: 95,
      progressColor: "bg-green-500",
      progressLabel: "Last 3 Units Available",
      completionLabel: "Completed: 2023",
      cta: "Schedule Viewing",
      badge: "Best Seller",
      badgeColor: "bg-red-500",
    },
  ],
  totalListings: 124,
  totalCities: 8,
};

export const FEATURED_BLOG = {
  image: LISTING_IMAGE,
  title:
    "The Future of Co-Living: AI-Driven Compatibility in Modern Real Estate",
  excerpt:
    "Discover how artificial intelligence is reshaping the way we find roommates and homes, creating more harmonious living environments for urban professionals.",
  date: "Oct 24, 2023",
  readTime: "5 min read",
  author: "Sarah Jenkins & Team",
  authorAvatar:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuB_4SvcWoGcNeLbmGkFWtvLLLbuDgZVAW1Vt0-MKRFxdPra44gHP1PGCvcdXlhWwgw49mX4x7YJaxJgkWwuw8J4g4zg_2lo8oRD90_zfTxebHh2iBxiJqMNehmKdDXP5r2pLHRFJ3kUmSLSjv21iDfPwCvoZBYSZ4-FLbYcaHclTWDCUSUeE-IbmSSqwbA2GdcVePVfZ-V39KGMmMiQRHot8o1UtZKxDkr0k6VtFsdgGpFqmRNltwxE5nB6Z7PCKiFkiPJ5G5S-ld--",
};

export const BLOG_POSTS: BlogPost[] = [
  {
    id: "1",
    title: "Minimalist Living: Maximizing Small Spaces in Urban Lofts",
    excerpt:
      "Practical tips and layout strategies for transforming compact city apartments into spacious-feeling sanctuaries.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBibdq75F1VTpKHQtvVZZwBvVl3R1E9pSbyET56uJKdzajSf9cOjRXTF9Wz9ZzE9ddO_eTDjp-yIQes4meJbG6FBtGUqNn-tiH2FMhwP6_HPIxcfVIBRrL-OA7ew46dttyWX-FZ9TwDEFS1-7MFT_LQbUbRmYdsai4BWEJlh3PVNb0REHIdcyg3-TpiQazIw10LwSxeyWrrBvxgnkhTYqvBvn2sFlnlBAc_r-kyHJK-s_ym8zTi9noH39hUeHAb2Dh0NICKgM_mX00Q",
    category: "Home Decor",
    date: "Oct 20, 2023",
    author: "Design Team",
  },
  {
    id: "2",
    title: "Q4 Real Estate Outlook: Where are Rent Prices Heading?",
    excerpt:
      "An in-depth analysis of rental market fluctuations across major metropolitan areas and predictions for the coming year.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA3NBcgn5tNDlZemxp_zFAydpReYVPOG93ZwywoFZhhDT4gXhh4ocsOMgtJZVaHLmYVRIoPTVZIBCd58xRlR-hl5ocQTg8qoqWSiBiTuBB90XWU0a7fOP368BMyQfWX7AxKDAu0ShxBUPWJujYjbGxjXlQCkKrvBWaxS7UuCncMK0aSBObBA6jkCrNAlYF76PXke1CPRoL299b1y4NILgsz06UQLfip3OX4E2d_K4RmPhL2NzXjxuzprNNhDE7lJEjLmcXaWHt5fT5v",
    category: "Market Trends",
    date: "Oct 18, 2023",
    author: "Axiom Analytics",
  },
  {
    id: "3",
    title:
      "Hidden Gems of Brooklyn: A Renter's Guide to Emerging Neighborhoods",
    excerpt:
      "Exploring the cultural hotspots and affordable pockets of Brooklyn that are attracting creative professionals.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCa0fy98t2PE0mzURm78ZcUB19Dxx-6i5y5L8ZoKj4xjXf54-xtPNemSEp1P7z8nHfaFIok9w7iE9m3xXPbuSNTmQaAVouVmLf8Bdbr-9PWR3DMAIqv590wXmphqQGuN6gGo66YRQ4WenHi9hM5k5CPX3zgiunyF1kVokyriOznJZpf8iUcLjciW0PT5NnPpFDFVyw_HlMzQ_YcKu4FdbTezBShp2uUQTOh9cPerlRFAVq0YmcJmoIAssiwMXT-AAWp5MzjccuRMZ8u",
    category: "City Guide",
    date: "Oct 15, 2023",
    author: "Local Expert",
  },
  {
    id: "4",
    title: "Eco-Friendly Rentals: What to Look For in a Green Home",
    excerpt:
      "From energy-efficient appliances to LEED certifications, here is how to find a rental that aligns with your values.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAyS8GwZYivZ5vtVghreVcZA9DkKpdZmBW2L4V7NRQYF-igOveMapP-k-n2KhEG4mGGgxUbj5Dm6NM558oqkHUmg0rhT_i4_T4wm-c0c1VklA-bzg5gJSB3JQLK_CHLrNed_jMnnNF3Xj-lLwhEeTFMomkWgaxh7TWafj6W4Y_9jHBlxoje5jDI7Dh2pzPprbyoPwtQ9XcEojHGPjdYw9eJuhWNq8GnehqMhfyFea7f53sD7mJxWOQPke8giuetzjmxnyrF--PEIyP9",
    category: "Sustainability",
    date: "Oct 12, 2023",
    author: "Eco Living",
  },
];

export const POPULAR_POSTS: PopularPost[] = [
  {
    id: "p1",
    title: "Top 10 Affordable Areas in London 2024",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAkeB9qq9tw8Lcy9mNQgWhonawRecIqRPNuyMMECfPmjsaUY4xQ4I5GFQ3aBNHT7RC8eDvvDWvVC7bfQQ1qqJDvKHLRpOFz4v5txJJHe217E_DqhSr6s_O91qrBhj1Wa6YRM3BsvdXRoZFx1piJplzHrbXCyCttggvC7IoeuaKGlrC6k0QZzWIux5oSTwplQ3nueDTNhpTdoIFmVY0f3D3pnjiakw7vTGVuf46DRg8AaTFY8BEKhfsWyKS3n2JJIrC-3mFg179Dl5ld",
    category: "City Guide",
    timeAgo: "3 days ago",
  },
  {
    id: "p2",
    title: "How to Split Chores Without Fighting",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBE4RHfV7QXDXgpKg3yRTNhHhzG1zZzxPYWmKiS5RTtMYREhE4uUpsvUJRO8x8nAhekxVi-6N5Q_71kQ0pvdJi-YvC9uD6xK7RmQv2m08cyuJ_a5LY_FoFriwzVHrDvWe4s6YL4WSE7QAw9exxXZiD5vaHFES6495OgztTo2h335ODEqZ8K0k6hTQZSFXCvYOFsQuHje9mk5seD2KMO9br2yIoT6_eaONJrncYEG0halQzZQR0SLd8JN63mh9XFvM3I0RAvV5IivyWU",
    category: "Lifestyle",
    timeAgo: "1 week ago",
  },
  {
    id: "p3",
    title: "Smart Home Gadgets Every Renter Needs",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDahSqwHuUwpGgeqZjJvepifTLfPOsU72PmnzYthgNkIr820Wv3e4wqu884PZ_MUvtCOsz7bZCfZd6gNme246VRdOr_GW0Rmpx77TLABQU24B43YYi61a_XpeUiWEi2cHjJAgGmDguzpeLf6yS9oUuWCiSEXcqdhRE6Hsff_Za1zDdc7uZ3TXO8qF0jwc2pdd5UuafW1zBvUBuVk9tHz090Kz_nJdb7kUSskdPt-YRQ5OHav7iLgDlR21i39OXHYtzD43EcYYQ8Vi4d",
    category: "Tech",
    timeAgo: "2 weeks ago",
  },
];

export const BLOG_TOPICS = [
  "Market Trends",
  "Interior Design",
  "Co-living",
  "Renting Tips",
  "Finance",
  "Lifestyle",
];

export const SHARED_HOUSING_DETAIL: SharedHousingDetail = {
  id: "sh1",
  ownerId: "broker1",
  title: "The Mission Collective",
  location: "Mission District, San Francisco, CA",
  image: LISTING_IMAGE,
  images: [LISTING_IMAGE],
  verified: true,
  price: 1150,
  utilitiesIncluded: true,
  availableDate: "Nov 1st",
  availability: "1 Room Available",
  occupancy: "3 Housemates",
  bathroom: "Shared Bath",
  furnishing: "Furnished",
  description: [
    "Welcome to The Mission Collective, a vibrant shared living space for creatives and professionals. We are located in a stunningly renovated industrial loft that encourages community while respecting privacy. The common areas are spacious with 16-foot ceilings, fostering an open atmosphere perfect for weekend brunches or evening coworking sessions.",
    "Lifestyle & Vibe: We are a social household but value quiet hours during the work week (10 PM - 8 AM). We enjoy occasional house dinners and movie nights but understanding personal boundaries is key. We are looking for someone who is clean, respectful, and communicates openly.",
    "House Rules: No shoes in the house, overnight guests are welcome up to 3 nights a week with notice, and we share a rotating cleaning schedule for common areas.",
  ],
  housemates: [
    {
      name: "Sarah",
      age: 26,
      occupation: "UX Designer",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCN48-yZxdV3j9VcGJ-WCpqtM9loOU6GF939XjciJhX6vxaZJHLowDU6veta4TcqKIbTEwdNRtbxAPDACYifacvN-i9poSokh7nfjpKRERojePssySft2N6IVA_mFX6M8tYUGsxt91pTvQyYSnQbFXgIVT8DPwZpK2WR3gCHHofSUltqH9_fMCWeKw91v3sPsI1dHhmrfahIdHy8iwgpkRx_45R-ZegYtW635wKs3Ccjo5TslKyLiyR9xFTJYxE4ID1ou18LPpW7Rwq",
      tags: ["WFH", "Quiet"],
    },
    {
      name: "David",
      age: 29,
      occupation: "Software Eng.",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDsNVqvJFUmaWbebPvPlmqZLMGzF-9_0NQcc-Me18gYkBA0z1nv6iwPLRAIGq_8raYIz3V3KGJv_LflFmKhKqsj0yQSjZVNRM4jjvJs2OU305q3LKH24ImxE7iGyWwci43OqFOYjyKXFk1nZhlrFF3hND41OgFeD29ppEF4_3HErK0sx9ne8plouhOkkYNgPb8ndi3yq_ZqSSmC2bqMkqBIuL8nIMsZFTTZJMimyf_NPNZS2I9mXIEdBN03qsAvCCPr6dp5z4Fnnvh2",
      tags: ["Gamer", "Night Owl"],
    },
    {
      name: "Elena",
      age: 24,
      occupation: "Grad Student",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBMwGJayFlr2Dzo8X3b9A_24VhKLO_Hh8kBJHRXuURcRdgTVzzKCADlKNvXTyekylWPmmixwpW7DpbXTPM5X4Sjkmtq1GoEOjh6328pvAXNpw2bymstThSTlKqnBA9kz6Xg9vjDAPBdTvg1oZLIuowXAoHmXLNwYaB0YdBsvAQpZ9b9UxkR9XcYIeCcREA0v7mzabgyhaSi62SEmVVJztD8xwfLPMiQeQz5PgWGEn3SwLTLji793RarNJ4ra9mmLSUzh_PS-jjL3JDK",
      tags: ["Student", "Social"],
    },
  ],
  privateAmenities: [
    { icon: "Bed", label: "Private Bedroom (12x14)" },
    { icon: "DoorOpen", label: "Walk-in Closet" },
    { icon: "Monitor", label: "Work Desk" },
  ],
  sharedAmenities: [
    { icon: "CookingPot", label: "Chef's Kitchen" },
    { icon: "Bath", label: "Main Bathroom" },
    { icon: "WashingMachine", label: "In-unit Laundry" },
    { icon: "Wifi", label: "Gigabit WiFi" },
  ],
  similarRooms: [
    {
      id: "sr1",
      title: "Sunny Room in SoMa",
      housemates: "2 Housemates",
      price: 1250,
      image: LISTING_IMAGE,
    },
    {
      id: "sr2",
      title: "Dogpatch Collective",
      housemates: "4 Housemates",
      price: 1100,
      image: LISTING_IMAGE,
    },
  ],
};

const LISTING_IMAGE_2 =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBibdq75F1VTpKHQtvVZZwBvVl3R1E9pSbyET56uJKdzajSf9cOjRXTF9Wz9ZzE9ddO_eTDjp-yIQes4meJbG6FBtGUqNn-tiH2FMhwP6_HPIxcfVIBRrL-OA7ew46dttyWX-FZ9TwDEFS1-7MFT_LQbUbRmYdsai4BWEJlh3PVNb0REHIdcyg3-TpiQazIw10LwSxeyWrrBvxgnkhTYqvBvn2sFlnlBAc_r-kyHJK-s_ym8zTi9noH39hUeHAb2Dh0NICKgM_mX00Q";

const LISTING_IMAGE_3 =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA3NBcgn5tNDlZemxp_zFAydpReYVPOG93ZwywoFZhhDT4gXhh4ocsOMgtJZVaHLmYVRIoPTVZIBCd58xRlR-hl5ocQTg8qoqWSiBiTuBB90XWU0a7fOP368BMyQfWX7AxKDAu0ShxBUPWJujYjbGxjXlQCkKrvBWaxS7UuCncMK0aSBObBA6jkCrNAlYF76PXke1CPRoL299b1y4NILgsz06UQLfip3OX4E2d_K4RmPhL2NzXjxuzprNNhDE7lJEjLmcXaWHt5fT5v";

const LISTING_IMAGE_4 =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCd9Ldp_5Pku0t9yWgSEaoWULuFjK3VekL8deJvqCYQEZWgMaV-f-9M5e5J9c5zMbdjOCZpUCRhrSi3Uw6Rr8O5ftjWlMK2YfPOQUBhRmTP8qREUtswyu6VKQAFz1d6CZJcNRHUM9SjY5dAn9eJ71haMSItriTezzSHqM8oz69U2lopFjZWNHPt_Cv_X6RrM-ep6Lhbkokod3-YKj2Vi43NvLnFjEUHhzBF62-epQIE08mI_USP30_mdQdXBzZrwyGutTXA9sUyCbxU";

export const PROJECT_DETAIL: ProjectDetail = {
  id: "p1",
  title: "The Obsidian Tower",
  subtitle: "Ultra-luxury waterfront residences redefining the skyline.",
  image: LISTING_IMAGE,
  developerName: "Axiom Developments",
  developerVerified: true,
  description:
    "Rising 65 stories above the bay, The Obsidian Tower offers an unparalleled living experience. Designed by world-renowned architects, this development features a collection of 154 bespoke residences, each with panoramic views and private terraces. Residents enjoy exclusive access to a 20,000 sq ft wellness center, private marina, and 24/7 concierge services.",
  completion: "Q4 2025",
  unitsTotal: "154 Residences",
  startingPrice: "$1.2M",
  status: "Selling Now",
  keyFeatures: [
    { icon: "Waves", label: "Infinity Pool" },
    { icon: "Dumbbell", label: "Wellness Center" },
    { icon: "Ship", label: "Private Marina" },
    { icon: "Car", label: "Valet Parking" },
    { icon: "ShieldCheck", label: "24/7 Security" },
  ],
  residences: [
    {
      id: "r1",
      title: "Penthouse Collection A",
      subtitle: "Top Floor • Ocean View",
      image: LISTING_IMAGE,
      beds: "4",
      baths: "4.5",
      size: "4,200 sf",
      price: "$4.8M",
    },
    {
      id: "r2",
      title: "Garden Villa",
      subtitle: "Ground Level • Private Patio",
      image: LISTING_IMAGE_2,
      beds: "3",
      baths: "3",
      size: "2,850 sf",
      price: "$2.5M",
    },
    {
      id: "r3",
      title: "Sky Residence Type B",
      subtitle: "Mid-High Floor • City View",
      image: LISTING_IMAGE_3,
      beds: "2",
      baths: "2.5",
      size: "1,800 sf",
      price: "$1.2M",
    },
    {
      id: "r4",
      title: "Executive Suite",
      subtitle: "Low Floor • Minimalist",
      image: LISTING_IMAGE_4,
      beds: "1",
      baths: "1.5",
      size: "950 sf",
      price: "$890k",
    },
  ],
  salesAgent: {
    name: "Sarah Jenkins",
    role: "Senior Sales Director",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB8KUOAL3u6PswIAARf0htA4tctE7bSMyWrXvwbtY_y9Pu-rHiu6tN5q7u2yZaYxMRyNO4jVMnGTpDWeSXd__NcDPcywTYvNGTBEI7Yq4-gQ6cyD8nmFcS2-gbF2njPXqzBCrKtlfNmOb2RMvnX5YeuOI6cRIf4tEp0Z13u-G7amof58KrkAhOxu5J4DfHrVqqISuwG6FonC-w9Gl8YYaips4NfGRSMTrPLemnkCVZheRluX4GbS8ZKP0B2FzG4dauK55Og5moZaTAB",
  },
  residenceOptions: [
    "Penthouse Collection",
    "Garden Villa",
    "Sky Residences",
    "General Inquiry",
  ],
  documents: [
    { title: "Floor Plans Brochure", size: "PDF • 12.5 MB", icon: "FileText" },
    { title: "Price List Q3", size: "PDF • 2.1 MB", icon: "Receipt" },
  ],
};

/* ── Dashboard (Mock Data) ─────────────────────────────── */

export const ANALYTICS_STATS: AnalyticsStat[] = [
  {
    label: "Total Views",
    value: "24.5K",
    icon: "Eye",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    bars: [30, 45, 35, 60, 50, 75, 85],
    barColor: "bg-primary",
    trendPercent: "12%",
    trendUp: true,
  },
  {
    label: "Leads Generated",
    value: "186",
    icon: "UserPlus",
    iconBg: "bg-green-500/10",
    iconColor: "text-green-400",
    bars: [20, 40, 30, 55, 45, 65, 90],
    barColor: "bg-green-500",
    trendPercent: "8%",
    trendUp: true,
  },
  {
    label: "Conversion Rate",
    value: "3.2%",
    icon: "TrendingUp",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    bars: [40, 35, 50, 45, 60, 55, 70],
    barColor: "bg-blue-500",
    trendPercent: "1%",
    trendUp: false,
  },
];

export const DASHBOARD_MESSAGES: DashboardMessage[] = [
  {
    id: "1",
    name: "David - Lead",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDahSqwHuUwpGgeqZjJvepifTLfPOsU72PmnzYthgNkIr820Wv3e4wqu884PZ_MUvtCOsz7bZCfZd6gNme246VRdOr_GW0Rmpx77TLABQU24B43YYi61a_XpeUiWEi2cHjJAgGmDguzpeLf6yS9oUuWCiSEXcqdhRE6Hsff_Za1zDdc7uZ3TXO8qF0jwc2pdd5UuafW1zBvUBuVk9tHz090Kz_nJdb7kUSskdPt-YRQ5OHav7iLgDlR21i39OXHYtzD43EcYYQ8Vi4d",
    preview: "I saw the listing for the Hayes Valley loft...",
    time: "10:42 AM",
    online: true,
    unread: true,
  },
  {
    id: "2",
    name: "Elena Rodriguez",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD9dVkaS4zjKTsaQDVypFOhzpmOAHtFHHMnx55zq4VhbBlkfAh0SnpHZssRMwlZetPk8-mItqowdyLYF3seuuK0lnFS9T8ct3jQSUP7f9iX5S8KVflGbqX7M5ReX5evaymuADNSZg9Sek77gohJcmW6Wf8lnvyBcUU0_mpukWd7O99kitNKwRWFGO6A-4VBOOjzZ63R5ic1RzqAjYU34TTJeoRtp70fdtX65-NYRphe5F6MRddeAjx0c7-oTe2ZG2eC2wqxQWJEnfO7",
    preview: "When is the next open house scheduled?",
    time: "Yesterday",
  },
  {
    id: "3",
    name: "Marcus Johnson",
    initials: "MJ",
    preview: "Offer submitted for 123 Main St.",
    time: "Oct 12",
  },
];

export const LISTING_CATEGORIES = [
  { value: "for_rent", label: "For Rent" },
  { value: "for_sale", label: "For Sale" },
  { value: "shared_housing", label: "Shared Housing" },
] as const;

export const PROPERTY_TYPES = [
  "Apartment",
  "Villa",
  "Studio",
  "Penthouse",
  "Duplex",
  "Townhouse",
  "Chalet",
  "Office",
  "Shop",
] as const;

export const FURNISHING_OPTIONS = [
  "Furnished",
  "Semi-Furnished",
  "Unfurnished",
] as const;

export const LISTING_AMENITIES = [
  "Parking",
  "Swimming Pool",
  "Gym",
  "Garden",
  "Security",
  "Elevator",
  "Central AC",
  "Balcony",
  "Storage Room",
  "Maid's Room",
];

/* ── User Dashboard ───────────────────────────────────── */

const USER_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDP9htRA-NqUYvVw7A1ZbiJNNdEBy7s5kluqVzKpHu5Clf7wLxzaRhd_4yIzEZRTlEa8x34GStStdDUCPrUMhhS70hIrIcw2vgy_Ld0UKMCHEaps6_bZgvkJNYuQ_I7f_-PMQSSuahE-mdS0DIneumTpHxG70UlfkaLKrzvDoLrwn6K0BBt7mQtCe05qlLw7bvdHXDmcMHmMwDPYKeEBugJw7FQl1CKM2WKUYpN0EO9n3MT0s69wMnX7QWwShmO03yLwqO9QQtxaZ7n";

export const USER_PROFILE: UserProfile = {
  name: "Sarah Jenkins",
  avatar: USER_AVATAR,
  isVerifiedSeller: false,
  subtitle:
    "Software Engineer • Moving to San Francisco • Looking for 1BR/Studio",
  info: [
    { label: "Age / Gender", value: "28 Years, Female" },
    { label: "Birthday", value: "October 14, 1995" },
    { label: "Location", value: "San Jose, CA" },
    { label: "Email Address", value: "sarah.jenkins@example.com" },
    { label: "Phone Number", value: "+1 (555) 123-4567" },
    { label: "Member Since", value: "August 2022" },
  ],
};

export const LIKED_PROPERTIES: LikedProperty[] = [
  {
    id: "1",
    title: "Industrial Arts Loft",
    location: "Hayes Valley, SF",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDIgpp5RaTRHgduce7EJNsecsSIvCfIcE7G8b-6UddfNkO6SwIluzJzuD2vJmVzf3P7SEtFr3eebmTH2GhU6sJsLqBW_M9k_4uTUnuTcUmFNHFCzhSCMmbR_prcpFUYDpGogXf0qXYQepi1KPrv2JveaYiKsNkY6GrgUSymxhAv7YKbYU_HvNVVGlWj95qcgr9co8da1CQsoOLdknAR6fT3a8vd4pGCTqv8z9tuHSTFB-nf9uqyqKm3Yvm0r8E-eRc_lYNvjZvL7Dqq",
    price: "$2,400",
    priceSuffix: "/month",
    specs: ["2 Beds", "1 Bath"],
    addedAgo: "Added 2 days ago",
  },
  {
    id: "2",
    title: "Eco-Friendly House",
    location: "Berkeley, CA",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBibdq75F1VTpKHQtvVZZwBvVl3R1E9pSbyET56uJKdzajSf9cOjRXTF9Wz9ZzE9ddO_eTDjp-yIQes4meJbG6FBtGUqNn-tiH2FMhwP6_HPIxcfVIBRrL-OA7ew46dttyWX-FZ9TwDEFS1-7MFT_LQbUbRmYdsai4BWEJlh3PVNb0REHIdcyg3-TpiQazIw10LwSxeyWrrBvxgnkhTYqvBvn2sFlnlBAc_r-kyHJK-s_ym8zTi9noH39hUeHAb2Dh0NICKgM_mX00Q",
    price: "$1,150",
    priceSuffix: "/month",
    specs: ["1 Bed", "Shared"],
    addedAgo: "Added 5 days ago",
  },
];

export const USER_MESSAGES: DashboardMessage[] = [
  {
    id: "1",
    name: "David from Mission Loft",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDahSqwHuUwpGgeqZjJvepifTLfPOsU72PmnzYthgNkIr820Wv3e4wqu884PZ_MUvtCOsz7bZCfZd6gNme246VRdOr_GW0Rmpx77TLABQU24B43YYi61a_XpeUiWEi2cHjJAgGmDguzpeLf6yS9oUuWCiSEXcqdhRE6Hsff_Za1zDdc7uZ3TXO8qF0jwc2pdd5UuafW1zBvUBuVk9tHz090Kz_nJdb7kUSskdPt-YRQ5OHav7iLgDlR21i39OXHYtzD43EcYYQ8Vi4d",
    preview:
      "Hey Sarah! We loved your profile. Would you be free to chat sometime this...",
    time: "10:42 AM",
    online: true,
    unread: true,
  },
  {
    id: "2",
    name: "Elena Rodriguez",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD9dVkaS4zjKTsaQDVypFOhzpmOAHtFHHMnx55zq4VhbBlkfAh0SnpHZssRMwlZetPk8-mItqowdyLYF3seuuK0lnFS9T8ct3jQSUP7f9iX5S8KVflGbqX7M5ReX5evaymuADNSZg9Sek77gohJcmW6Wf8lnvyBcUU0_mpukWd7O99kitNKwRWFGO6A-4VBOOjzZ63R5ic1RzqAjYU34TTJeoRtp70fdtX65-NYRphe5F6MRddeAjx0c7-oTe2ZG2eC2wqxQWJEnfO7",
    preview: "Is the room still available? I'm looking to move in by next month.",
    time: "Yesterday",
  },
  {
    id: "3",
    name: "Marcus Johnson",
    initials: "MJ",
    preview: "Application status update: Approved!",
    time: "Oct 12",
  },
  {
    id: "4",
    name: "Skyline Management",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA3NBcgn5tNDlZemxp_zFAydpReYVPOG93ZwywoFZhhDT4gXhh4ocsOMgtJZVaHLmYVRIoPTVZIBCd58xRlR-hl5ocQTg8qoqWSiBiTuBB90XWU0a7fOP368BMyQfWX7AxKDAu0ShxBUPWJujYjbGxjXlQCkKrvBWaxS7UuCncMK0aSBObBA6jkCrNAlYF76PXke1CPRoL299b1y4NILgsz06UQLfip3OX4E2d_K4RmPhL2NzXjxuzprNNhDE7lJEjLmcXaWHt5fT5v",
    preview: "Thank you for your inquiry about the...",
    time: "Oct 10",
  },
];

/* ── Messages / Inbox ─────────────────────────────────── */

const DAVID_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDahSqwHuUwpGgeqZjJvepifTLfPOsU72PmnzYthgNkIr820Wv3e4wqu884PZ_MUvtCOsz7bZCfZd6gNme246VRdOr_GW0Rmpx77TLABQU24B43YYi61a_XpeUiWEi2cHjJAgGmDguzpeLf6yS9oUuWCiSEXcqdhRE6Hsff_Za1zDdc7uZ3TXO8qF0jwc2pdd5UuafW1zBvUBuVk9tHz090Kz_nJdb7kUSskdPt-YRQ5OHav7iLgDlR21i39OXHYtzD43EcYYQ8Vi4d";

export const INBOX_CONTACTS: InboxContact[] = [
  {
    id: "david",
    name: "David - Lead",
    avatar: DAVID_AVATAR,
    preview: "Sounds good! Let me verify the details...",
    time: "10:42 AM",
    online: true,
    active: true,
  },
  {
    id: "elena",
    name: "Elena Rodriguez",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD9dVkaS4zjKTsaQDVypFOhzpmOAHtFHHMnx55zq4VhbBlkfAh0SnpHZssRMwlZetPk8-mItqowdyLYF3seuuK0lnFS9T8ct3jQSUP7f9iX5S8KVflGbqX7M5ReX5evaymuADNSZg9Sek77gohJcmW6Wf8lnvyBcUU0_mpukWd7O99kitNKwRWFGO6A-4VBOOjzZ63R5ic1RzqAjYU34TTJeoRtp70fdtX65-NYRphe5F6MRddeAjx0c7-oTe2ZG2eC2wqxQWJEnfO7",
    preview: "Is the room still available? I'm looking to...",
    time: "Yesterday",
  },
  {
    id: "skyline",
    name: "Skyline Management",
    initials: "SM",
    initialsBg: "bg-primary/10",
    initialsColor: "text-primary",
    preview: "Please review the lease agreement attached...",
    time: "Oct 12",
  },
  {
    id: "marcus",
    name: "Marcus Johnson",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA3NBcgn5tNDlZemxp_zFAydpReYVPOG93ZwywoFZhhDT4gXhh4ocsOMgtJZVaHLmYVRIoPTVZIBCd58xRlR-hl5ocQTg8qoqWSiBiTuBB90XWU0a7fOP368BMyQfWX7AxKDAu0ShxBUPWJujYjbGxjXlQCkKrvBWaxS7UuCncMK0aSBObBA6jkCrNAlYF76PXke1CPRoL299b1y4NILgsz06UQLfip3OX4E2d_K4RmPhL2NzXjxuzprNNhDE7lJEjLmcXaWHt5fT5v",
    preview: "Thanks for the tour today!",
    time: "Oct 10",
  },
  {
    id: "axiom",
    name: "Axiom Support",
    initials: "AI",
    initialsBg: "bg-purple-500/10",
    initialsColor: "text-purple-400",
    preview: "Welcome to Axiom! Let us know if you need...",
    time: "Oct 05",
  },
];

export const CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    sender: "them",
    text: "Hey Sarah! We loved your profile. Would you be free to chat sometime this week about the Mission Loft listing?",
    time: "10:30 AM",
    showAvatar: true,
  },
  {
    id: "2",
    sender: "me",
    text: "Hi David! Thanks for reaching out. Yes, I'm definitely interested. The industrial vibe looks amazing.",
    time: "10:35 AM",
    showAvatar: true,
  },
  {
    id: "3",
    sender: "me",
    text: "I'm free Tuesday afternoon or Thursday morning. Does either work for you?",
    time: "10:36 AM",
    showAvatar: false,
  },
  {
    id: "4",
    sender: "them",
    text: "Thursday morning at 10 AM works perfectly. I can show you the common areas and the specific unit.",
    time: "10:40 AM",
    showAvatar: true,
  },
  {
    id: "5",
    sender: "them",
    text: "Sending over the floor plan beforehand!",
    time: "10:42 AM",
    showAvatar: false,
    attachment: {
      name: "Floor_Plan_Unit_4B.pdf",
      size: "2.4 MB",
    },
  },
];

/* ── Blog Article ─────────────────────────────────────── */

export const BLOG_ARTICLE: BlogArticle = {
  slug: "future-of-co-living",
  title: "The Future of Co-Living: AI-Driven Compatibility",
  image:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDIgpp5RaTRHgduce7EJNsecsSIvCfIcE7G8b-6UddfNkO6SwIluzJzuD2vJmVzf3P7SEtFr3eebmTH2GhU6sJsLqBW_M9k_4uTUnuTcUmFNHFCzhSCMmbR_prcpFUYDpGogXf0qXYQepi1KPrv2JveaYiKsNkY6GrgUSymxhAv7YKbYU_HvNVVGlWj95qcgr9co8da1CQsoOLdknAR6fT3a8vd4pGCTqv8z9tuHSTFB-nf9uqyqKm3Yvm0r8E-eRc_lYNvjZvL7Dqq",
  category: "Co-living",
  date: "Oct 24, 2023",
  readTime: "8 min read",
  author: {
    name: "Sarah Jenkins",
    role: "Senior Real Estate Analyst",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB_4SvcWoGcNeLbmGkFWtvLLLbuDgZVAW1Vt0-MKRFxdPra44gHP1PGCvcdXlhWwgw49mX4x7YJaxJgkWwuw8J4g4zg_2lo8oRD90_zfTxebHh2iBxiJqMNehmKdDXP5r2pLHRFJ3kUmSLSjv21iDfPwCvoZBYSZ4-FLbYcaHclTWDCUSUeE-IbmSSqwbA2GdcVePVfZ-V39KGMmMiQRHot8o1UtZKxDkr0k6VtFsdgGpFqmRNltwxE5nB6Z7PCKiFkiPJ5G5S-ld--",
  },
  lead: "Discover how artificial intelligence is reshaping the way we find roommates and homes, creating more harmonious living environments for urban professionals and redefining the concept of shared spaces.",
  content: [
    {
      type: "paragraph",
      text: "In the bustling hearts of metropolises like New York, London, and Tokyo, the traditional model of renting is undergoing a radical transformation. Gone are the days of sifting through endless Craigslist ads or relying on luck to find a compatible roommate. The future of co-living is here, and it is powered by advanced artificial intelligence.",
    },
    {
      type: "paragraph",
      text: 'At Axiom, we\'ve observed a 300% increase in demand for managed co-living spaces over the last two years. But it\'s not just about shared amenities or lower costs—it\'s about the <strong class="text-white">human connection</strong>.',
    },
    {
      type: "takeaways",
      items: [
        "AI algorithms are now capable of matching roommates with 85% higher satisfaction rates than traditional methods.",
        "Co-living spaces designed with behavioral data reduce conflict and increase lease renewal retention.",
        "Smart contracts and automated rent splitting are removing financial friction from shared living arrangements.",
      ],
    },
    {
      type: "heading",
      text: "The Psychology of Compatibility",
    },
    {
      type: "paragraph",
      text: "Historically, roommate matching was based on surface-level criteria: budget, location, and perhaps a preference for pets. However, psychologists have long known that lifestyle compatibility runs much deeper. Circadian rhythms, cleanliness standards, and social battery recharge methods are far better predictors of domestic harmony.",
    },
    {
      type: "paragraph",
      text: "By leveraging machine learning models trained on millions of successful roommate pairings, platforms like Axiom can now predict compatibility scores.",
    },
    {
      type: "blockquote",
      text: "We aren't just matching people with apartments; we are matching people with their future community. That distinction changes everything.",
      attribution: "Dr. Elena Rostova, Behavioral Data Scientist",
    },
    {
      type: "heading",
      text: "Tech-Enabled Spaces",
    },
    {
      type: "paragraph",
      text: 'The physical spaces themselves are evolving. Architects are now using usage data to design "collision zones" that foster interaction and "retreat zones" that guarantee privacy. Soundproofing technology has advanced significantly, allowing for high-density living without the noise pollution that typically plagues urban apartments.',
    },
    {
      type: "list",
      items: [
        "<strong>Smart Access Control:</strong> Keyless entry systems that allow for temporary guest passes.",
        "<strong>Automated Resource Management:</strong> AI that tracks shared supply usage (like toilet paper or cleaning supplies) and auto-orders replenishment.",
        "<strong>Dynamic Common Areas:</strong> Modular furniture systems that can reconfigure a lounge into a co-working space based on the time of day.",
      ],
    },
    {
      type: "paragraph",
      text: 'As we move into 2024, the definition of home is becoming fluid, intelligent, and deeply social. For the modern urbanite, the question is no longer just "Where do I live?" but "Who do I grow with?"',
    },
  ],
  tags: ["#CoLiving", "#PropTech", "#FutureOfLiving"],
};

export const RELATED_ARTICLES: RelatedArticle[] = [
  {
    slug: "minimalist-living",
    title: "Minimalist Living: Maximizing Small Spaces",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBibdq75F1VTpKHQtvVZZwBvVl3R1E9pSbyET56uJKdzajSf9cOjRXTF9Wz9ZzE9ddO_eTDjp-yIQes4meJbG6FBtGUqNn-tiH2FMhwP6_HPIxcfVIBRrL-OA7ew46dttyWX-FZ9TwDEFS1-7MFT_LQbUbRmYdsai4BWEJlh3PVNb0REHIdcyg3-TpiQazIw10LwSxeyWrrBvxgnkhTYqvBvn2sFlnlBAc_r-kyHJK-s_ym8zTi9noH39hUeHAb2Dh0NICKgM_mX00Q",
    category: "Design",
    date: "Oct 20, 2023",
    readTime: "5 min read",
  },
  {
    slug: "q4-rental-outlook",
    title: "Q4 Real Estate Outlook: Rental Prices",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA3NBcgn5tNDlZemxp_zFAydpReYVPOG93ZwywoFZhhDT4gXhh4ocsOMgtJZVaHLmYVRIoPTVZIBCd58xRlR-hl5ocQTg8qoqWSiBiTuBB90XWU0a7fOP368BMyQfWX7AxKDAu0ShxBUPWJujYjbGxjXlQCkKrvBWaxS7UuCncMK0aSBObBA6jkCrNAlYF76PXke1CPRoL299b1y4NILgsz06UQLfip3OX4E2d_K4RmPhL2NzXjxuzprNNhDE7lJEjLmcXaWHt5fT5v",
    category: "Market",
    date: "Oct 18, 2023",
    readTime: "7 min read",
  },
  {
    slug: "eco-friendly-rentals",
    title: "Eco-Friendly Rentals Guide",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAyS8GwZYivZ5vtVghreVcZA9DkKpdZmBW2L4V7NRQYF-igOveMapP-k-n2KhEG4mGGgxUbj5Dm6NM558oqkHUmg0rhT_i4_T4wm-c0c1VklA-bzg5gJSB3JQLK_CHLrNed_jMnnNF3Xj-lLwhEeTFMomkWgaxh7TWafj6W4Y_9jHBlxoje5jDI7Dh2pzPprbyoPwtQ9XcEojHGPjdYw9eJuhWNq8GnehqMhfyFea7f53sD7mJxWOQPke8giuetzjmxnyrF--PEIyP9",
    category: "Green",
    date: "Oct 12, 2023",
    readTime: "4 min read",
  },
  {
    slug: "smart-home-gadgets",
    title: "Smart Home Gadgets for Renters",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDahSqwHuUwpGgeqZjJvepifTLfPOsU72PmnzYthgNkIr820Wv3e4wqu884PZ_MUvtCOsz7bZCfZd6gNme246VRdOr_GW0Rmpx77TLABQU24B43YYi61a_XpeUiWEi2cHjJAgGmDguzpeLf6yS9oUuWCiSEXcqdhRE6Hsff_Za1zDdc7uZ3TXO8qF0jwc2pdd5UuafW1zBvUBuVk9tHz090Kz_nJdb7kUSskdPt-YRQ5OHav7iLgDlR21i39OXHYtzD43EcYYQ8Vi4d",
    category: "Tech",
    date: "Oct 10, 2023",
    readTime: "6 min read",
  },
];
