'use server';

import { auth } from '@repo/auth/server';
import { prisma } from '@repo/db';
import { Tags, type Difficulty } from '@repo/db/types';
import { AOT_CHALLENGES } from '../../challenge/[slug]/aot-slugs';
import { cache } from 'react';

export type ExploreChallengeData = ReturnType<typeof getChallengesByTagOrDifficulty>;
const allTags: Tags[] = Object.values(Tags);

/**
 * Fetches challenges either by tag or difficulty.
 */
export async function getChallengesByTagOrDifficulty(str: string, take?: number) {
  const session = await auth();
  const formattedStr = str.trim().toUpperCase();

  return prisma.challenge.findMany({
    where: {
      status: 'ACTIVE',
      user: {
        NOT: {
          status: 'BANNED',
        },
      },
      slug: {
        notIn: AOT_CHALLENGES,
      },
      // OR didn't work. so this workaround is fine because IT WORKS :3
      ...(allTags.includes(formattedStr as keyof typeof Tags)
        ? {
            tags: { every: { tag: formattedStr as Tags } },
          }
        : {
            difficulty: { in: [formattedStr as Difficulty] },
          }),
    },
    include: {
      _count: {
        select: { vote: true, comment: true },
      },
      user: {
        select: {
          name: true,
        },
      },
      submission: {
        where: {
          userId: session?.user?.id || '',
          isSuccessful: true,
        },
        take: 1,
      },
    },
    ...(take && {
      take,
    }),
  });
}

/**
 * Fetches the length of how many challenges are in a
 * difficutly / tag group
 * @param str difficutly or tag string
 */
export const getExploreChallengesLengthByTagOrDifficulty = cache((str: string) => {
  const formattedStr = str.trim().toUpperCase();

  return prisma.challenge.count({
    where: {
      status: 'ACTIVE',
      user: {
        NOT: {
          status: 'BANNED',
        },
      },
      difficulty: { in: [formattedStr as Difficulty] },
    },
  });
});
