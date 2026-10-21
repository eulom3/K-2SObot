"""
====================================================================
  DAILY GALACTIC DEGENERACY v2.0 — Vulgar Star Wars Bot
====================================================================
  - 1,000+ unique message combinations (handcrafted + generator)
  - Daily scheduled drops + !postnow
  - TRIGGER WORDS: say "sith", "stressed", "fuck", "hello there"...
    and the bot roasts you automatically

  COMMANDS:
    /setdaily    -> make this channel the daily drop zone (slash command)
    !postnow     -> force a message right now (prefix command)
    !nextdaily   -> countdown to next drop (prefix command)
    !count       -> how many unique messages the bot can generate (prefix command)
    !vulgarhelp  -> help menu (prefix command)
====================================================================
"""

import os
import re
import random
import asyncio
from datetime import datetime, time, timedelta, timezone

import discord
from discord.ext import commands, tasks
from dotenv import load_dotenv

load_dotenv()

# ------------------- CONFIG -------------------

BOT_PREFIX = "!"
DAILY_POST_TIME = time(hour=9, minute=0)
DAILY_TIMEZONE = timezone(timedelta(hours=-7))
CHANNELS_FILE = "daily_channels.txt"
TRIGGER_COOLDOWN_SECS = 45

TOKEN = os.getenv("DISCORD_TOKEN")

intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True


class DailyBot(commands.Bot):
    async def setup_hook(self):
        # Load every Python file in the cogs folder (including api_server.py)
        for filename in os.listdir("./cogs"):
            if filename.endswith(".py") and not filename.startswith("_"):
                extension = f"cogs.{filename[:-3]}"
                await self.load_extension(extension)
                print(f"Loaded cog: {extension}")

        # Sync server-specific commands, including /setstatus.
        guild = discord.Object(id=1477265653776912465)
        guild_synced = await self.tree.sync(guild=guild)
        print(f"Synced {len(guild_synced)} server slash command(s).")

        # Sync global commands, including /setdaily.
        global_synced = await self.tree.sync()
        print(f"Synced {len(global_synced)} global slash command(s).")


bot = DailyBot(
    command_prefix=BOT_PREFIX,
    intents=intents,
    help_command=None,
)

# ==================================================================
# HANDCRAFTED MESSAGES
# ==================================================================

DARK_HUMOR = [
    "Han shot first. Your dad shot... nothing. Ever. Sit down.",
    "Vader has asthma AND daddy issues. Basically every guy you matched with on Tinder.",
    "Qui-Gon died from ONE lightsaber stab. Maul got bisected and came back with robot legs. Respect the grind.",
    "Luke kissed his sister. THEN found out. The Force works in disgusting ways.",
    "The Death Star: a planet-sized ball that blew up in 2 movies. Your ex has more staying power.",
    "Anakin: hates sand. Also Anakin: murders children. Priorities, people.",
    "Obi-Wan let Vader win to become more powerful. You let sleep win to become more unemployed.",
    "Kylo Ren's helmet had a breathing filter for NO reason. That's not intimidating, that's a vape mod.",
    "Aunt Beru and Uncle Owen: the only people in Star Wars who died BEFORE becoming a plot point. Rest easy, legends.",
    "The Sarlacc takes 1,000 years to digest you. Your group chat takes 1,000 messages to pick a restaurant. Similar.",
    "Darth Plagueis could stop people from dying but couldn't stop being a nerd about it. Read the room, man.",
    "Lando sold out his friends then wore Han's clothes. Betrayal AND a fashion crime.",
    "Palpatine got thrown down a reactor shaft and STILL came back. Your gym membership can't even survive January.",
    "Maul lived as a half-spider in a trash planet for years and stayed ripped. You skip leg day because it's raining.",
    "Vader built C-3PO as a kid. The most evil man in the galaxy once made a sassy gold butler. Adorable, honestly.",
    "Rey came from nothing and became everything. You can't even finish your side project.",
    "Wedge Antilles survived two Death Star runs. Wedge is the real main character and I will die on this hill.",
    "Jar Jar is the reason the Senate gave Palpatine emergency powers. Never trust a clown. Not even in space.",
    "Yoda is 900 years old and rides on Luke's back like a backpack. Iconic freeloader behavior.",
    "The Ewoks defeated the Empire with sticks and rocks. Your excuses are invalid.",
    "Anakin turned evil because of a bad dream and a sand allergy. Men will literally join the dark side instead of going to therapy.",
    "Leia watched her home planet get blown up and gave a press conference 20 minutes later. Your coping skills? A nap and denial.",
    "Boba Fett fell into a pit and took 30 years to climb out. Same, buddy. Same.",
    "Stormtroopers couldn't hit water if they fell out of a boat. Kind of like you and your life goals.",
    "The Jedi Order took a kid from his mom and were shocked when he snapped. Amazing detective work, beige robes.",
    "Vader force-choked his own men for mild disappointment. Your manager just schedules a 'quick sync.'",
    "Count Dooku lost to a guy kneeling with one hand behind his back. Imagine being that guy. Actually, no imagination needed.",
    "General Grievous collects lightsabers like you collect half-finished side projects. Sad, really.",
    "The Emperor's master plan took 50 years and was undone by a janitor's kid and a former stormtrooper. Infrastructure matters.",
    "Padme died of sadness in a hospital with robots. That's not a death, that's a billing error.",
    "Hoth is cold. Dagobah is swampy. Your takes are lukewarm at best.",
    "C-3PO has been mind-wiped more times than you've said 'new year, new me.'",
    "Chewie watched his best friend get frozen and kept working. That's called emotional compartmentalization, sweetie.",
    "Finn defected after his FIRST battle. Took you three layoffs to update your resume.",
    "Holdo sacrificed herself by jumping to lightspeed through a fleet. You won't even merge into traffic politely.",
    "The entire Skywalker saga is a family yelling at each other across space. So basically Thanksgiving.",
    "Mace Windu had a purple lightsaber because Samuel L. Jackson wanted to be seen in a crowd. King behavior.",
    "Vader: 'I am your father.' Luke: screams and falls. Therapy was right there, Luke. DOWN THE SHAFT.",
    "Qui-Gon tried to buy a slave kid with gambling money. The Force works in sketchy ways too.",
    "The Mandalorian's entire personality is a helmet and a kid. So a dad, basically.",
    "Obi-Wan aged 40 years on Tatooine. Waiting for you to text back ages me the same.",
]

INSPIRATION = [
    "May the Force be with you... and may your underwear never betray you on a first date.",
    "Do or do not. There is no try. Also: flush or do not. There is no half-ass.",
    "Fear leads to anger. Anger leads to hate. Hate leads to skipping leg day. Not that you'd know.",
    "The Force can move objects, choke people, and influence minds. It STILL can't fix your Wi-Fi.",
    "Great, the grind is. Stop, it does not. Except for you. You stop a lot.",
    "A Jedi's strength flows from the Force. Yours flows from energy drinks and spite. Works though.",
    "In a galaxy of a trillion stars, you're here, reading this. Disappointing the odds since birth.",
    "Train yourself to let go of what you fear to lose. Start with your search history.",
    "Your focus determines your reality. So maybe stop focusing on the group chat at 3 AM.",
    "The dark side is quicker, easier, more seductive. Like microwaving fish in the office kitchen.",
    "Patience you must have, young one. Or a sniper. This is a varied galaxy.",
    "Size matters not. Judge me by my size, do you? That's what she said, Yoda did not. Hmm.",
    "You will find only what you bring in. So bring snacks. Always bring snacks.",
    "Clear your mind must be, if you are to find the answers. Have you tried turning it off and on again?",
    "The Force will be with you. Always. Unlike your paycheck, which arrives 'soon.'",
    "Difficult to see. Always in motion is the future. Also difficult to see: your abs. Ever.",
    "When nine hundred years old you reach, look as good you will not. Neither will your knees.",
    "You must unlearn what you have learned. Like your opinions. All of them.",
    "Luminous beings are we. Not this crude matter. So stop eating gas station sushi, crude matter.",
    "Wars not make one great. But they do make one tired. Like you. All the time.",
    "If into the security recordings you go, only pain will you find. Same for your ex's Instagram.",
    "The greatest teacher, failure is. You should be a Jedi Master by now, then.",
    "Smaller in number are we, but larger in mind. Kind of like your debt-to-income ratio, inverted.",
    "Attachment leads to jealousy. The shadow of greed, that is. Also, don't text them. It's 2 AM.",
    "Death is a natural part of life. So is cringe. You've mastered one, at least.",
    "Rejoice for those who transform into the Force. Mourn them, do not. Miss them, do not. Text your mom though.",
    "Control, control, you must learn control! Said every person who watched you parallel park.",
    "You think Yoda was born 900 years old? No. He was once young, and probably mid too. Growth is universal, padawan.",
    "The Force is strong in my family. My father has it. I have it. You have... a library card. Keep trying.",
    "Sometimes we must let go of our pride and do what is requested of us. Like showering. Daily. It's requested.",
    "Mind what you have learned. Save you it can. Your GPA, however, is beyond the Force now.",
    "To answer power with power, the Jedi way this is not. To answer email with email at 11 PM, the corporate way that is.",
    "May your code compile on the first try, and may your enemies step on LEGO bricks barefoot.",
    "The Force binds the galaxy together. Caffeine binds YOU together. We are not the same.",
]

ROASTS = [
    "You have the strategic mind of a battle droid and half the charm.",
    "If you were a droid, you'd be the one the Jawas refused to sell.",
    "You're the reason the Empire instituted performance reviews.",
    "I've seen more personality in a Rancor's litter box.",
    "You're like a stormtrooper: loud, everywhere, and hitting nothing.",
    "You bring everyone so much joy... when you leave the channel.",
    "You're proof the Force has a sense of humor.",
    "Somewhere out there, a Wookiee is embarrassed to share a species with you. That's biology, but still.",
    "You have the charisma of wet cardboard on Dagobah.",
    "Your last brain cell died of loneliness.",
    "You're not completely useless. You could still serve as a bad example.",
    "If mediocrity were a planet, you'd be its capital. They'd call it Mehhh-diocre Prime.",
    "You bring 'meh' to a galaxy far, far away and somehow make it closer and worse.",
    "Your blood type is Bantha poodoo.",
    "You've got the reflexes of a frozen Han Solo and the warmth of carbonite to match.",
    "Your lightsaber would be beige. Battery-powered. From a gas station.",
    "The Force ghost of your potential haunts us all.",
    "You'd survive Order 66 simply because no one would bother aiming at you.",
    "Your search history is the real Phantom Menace.",
    "You have resting Hutt face.",
    "Even the Sarlacc would spit you out. Takes too long to digest, zero nutritional value.",
    "Your group project energy single-handedly funded the Death Star.",
    "You type like Greedo shoots: first, confidently, and completely wrong.",
    "If overconfidence were fuel, you'd make the Kessel Run in negative parsecs and still crash.",
    "You're the human version of stepping in something on Mos Espa.",
]

YODA_STYLE = [
    "Pants on, must keep, when power you feel. Herh herh herh.",
    "Your mind on your money and your money on your mind, keep you must. Hmm.",
    "Flush the toilet after using, one must. Basic, this is. Shocked, I remain.",
    "Touch grass, you must. A lot of grass. Acres.",
    "Two types of people, there are: those who wave, and those who owe me money. Which are you, hmm?",
    "In bed by ten, a Jedi is. At 3 AM scrolling, a disappointment you are.",
    "Ketamine, I take not. Too much paperwork, the Council requires. But consider it, I do.",
    "Your rent, pay you must. Or become one with the Force, you will. Landlord's choice, that is.",
    "Text your mother. Now. Tell her Yoda said so.",
    "Anger, fear, aggression: the dark side are they. Your playlist, also, they are.",
    "Behind you, the answers are. Also a wall. Walk into it, do not. Check both ways, you should.",
    "Feed the cat, you must. Watching, she is. Always watching.",
    "A snack, every hour, one must have. Discovered the secret to longevity, I have. Sponsor me, Chipotle should.",
    "Shower. Daily. A suggestion, this is not. A threat, it is.",
    "Judge a book by its cover, do not. Judge a man by his browser tabs, I absolutely do.",
]

GENERAL_FILTH = [
    "R2-D2 beeps so much because he walked in on Anakin and Padme once. True story. Probably.",
    "C-3PO knows six million languages and still can't explain your dating life.",
    "Mos Eisley cantina: where droids aren't served, but everyone else is drunk by noon. Goals.",
    "Vader: 'I find your lack of faith disturbing.' Me: 'I find your lack of pants disturbing, Greg.'",
    "Luke whined about Tosche Station for three movies straight. Grow up, farm boy.",
    "Porgs exist purely to sell merch. And yet I'd still die for the little gremlins.",
    "Grand Moff Tarkin has a permanent resting 'I just smelled a fart' face.",
    "Lightsabers can cut through blast doors but you can't cut toxic people out of your life. Do better.",
    "Han owed money to everyone in the galaxy and still pulled Leia. Charisma > credit score.",
    "Admiral Ackbar saw that trap coming from a mile away. You can't see a red flag with binoculars.",
    "Chewbacca has carried Han's emotional baggage for 40 years. That's real friendship.",
    "The Millennium Falcon made the Kessel Run in 12 parsecs. Your code made production in 12 hotfixes.",
    "Palpatine: 'I am the Senate.' Your uncle after two beers: 'I am the barbecue.' Same energy.",
    "Two suns on Tatooine and Anakin STILL couldn't get a tan. Pathetic.",
    "If you think about it, every lightsaber duel is just two guys aggressively fanning each other.",
    "The spice mines of Kessel suck, but have you ever worked retail during the holidays?",
    "Cloudy with a chance of Tusken Raiders today. Also, you're still single.",
    "The spice must flow. So must the caffeine. Neither flows through you, apparently, judging by your energy.",
    "Obi-Wan: 'Hello there.' Grievous: 'General Kenobi.' Me at 3 AM: 'Where the hell are my pants.'",
    "This message was approved by 100% of the Jedi Council. The remaining 900% were at a strip club on Coruscant.",
    "Han owed Jabba money and got away with it for years. Your landlord knows your Venmo by heart.",
    "The Falcon's hyperdrive never works when you need it. Your car is the Millennium Falcon of reliability.",
    "A long time ago in a galaxy far, far away... someone else already did your idea, but better and with funding.",
    "The Force binds all living things. Even that guy. Yes, THAT one. No refunds.",
    "I find your lack of originality disturbing. Anyway, here's today's scheduled filth.",
    "Tatooine has two suns and zero shade. This channel has one bot and zero chill.",
    "In space, no one can hear you scream. In this channel, everyone can hear you type. And judge. We judge.",
    "Today's horoscope: Mercury is in retrograde, Saturn is in Gatorade, and you're in everyone's way.",
    "The Jedi Temple had a daycare. That explains a lot about Anakin, actually.",
    "Remember: somewhere out there, a Hutt is eating a frog-like creature whole, and you're worried about your haircut. Perspective.",
    "Rebellions are built on hope. Your plans are built on 'I'll do it tomorrow.'",
    "Astromech droids roll. Protocol droids walk. You? You scroll. Deep lore.",
    "The Death Star had one exhaust port flaw. You have several. We just live with yours.",
    "Dagobah is a swamp, and even IT has better living conditions than your sleep schedule.",
    "Bespin: a city in the clouds. You: a disappointment in the group chat. Both float, neither lands.",
    "Kashyyyk has walking trees. You have a walking disaster, and it's your budget.",
    "Naboo elected a 14-year-old queen. Your country elected... let's not finish that one.",
    "Every cantina band plays the same song. Every one of your jokes lands the same way: not at all.",
    "Vader's helmet does his breathing FOR him. Your standing desk does nothing for you.",
    "The Kaminoans cloned the best bounty hunter a trillion times. Your clone would get lost on the way to the cloning tank.",
]

# ==================================================================
# MESSAGE GENERATOR
# ==================================================================

SUBJECTS = [
    "the Force", "your lightsaber", "your landlord", "a Hutt's diet plan", "the Sith",
    "your midichlorians", "the Senate", "your Wookiee roommate", "the Death Star's HR department",
    "Jedi Master Yoda", "your tax accountant", "the Mos Eisley janitor", "your ex",
    "the droid you're looking for", "your battle meditation coach", "the cantina band",
    "your sleep schedule", "the dark side", "your group chat", "Admiral Ackbar's trap detector",
    "your bank account", "the spice trade", "your dating profile", "the Force ghost of your GPA",
]

ACTIONS = [
    "has filed a restraining order against", "is deeply disappointed in", "has unfriended",
    "force-choked", "ghosted harder than", "reported to the Jedi Council",
    "sold to the Jawas", "left a 1-star review of", "filed an HR complaint about",
    "photoshopped out of the holiday card with", "changed the Wi-Fi password on",
    "adopted", "put a bounty on", "force-blew a raspberry at", "subtweeted",
]

TARGETS = [
    "your life choices", "that thing you said at 2 AM", "your search history",
    "your five-year plan", "your gym membership", "your credit score",
    "your unfinished novel", "the way you chew", "your drunk texts",
    "your entire personality", "your sleep hygiene", "your group project contributions",
    "your password of 'password123'", "your karaoke rendition of the cantina song",
]

YODA_VERBS = [
    "running", "screaming", "vibing", "crying", "snacking", "lying",
    "scrolling", "failing", "thriving", "grinding", "nap-taking",
]

YODA_NOUNS = [
    "the dark side", "your rent", "the group chat", "your potential",
    "a leftover burrito", "the Sith", "your responsibilities", "the high ground",
    "your dignity", "a stray Porg", "your unread emails", "the simulation",
]

YODA_ENDINGS = [
    "hmm.", "you must.", "one should.", "a Jedi does. You do not.",
    "the Force demands.", "or bantha poodoo, become you will.",
]

GENERATOR_TEMPLATES = [
    "BREAKING: {subject} {action} {target}. More at nine.",
    "Sources confirm: {subject} {action} {target}. The Council is 'concerned.'",
    "Galaxy News Network reports {subject} {action} {target}. Locals are 'not surprised.'",
    "Wisdom of the day: {verb}, {subject} does. Yoda-approved, that ending is, {ending}",
    "Yoda's diary, day 847: '{verb} at 3 AM, they are again. {ending}'",
    "A Jedi's guide to life: stop {verb}, start winning. Also, avoid {subject}. {ending}",
]


def generate_message():
    """Build a semi-random headline/Yoda-ism."""
    template = random.choice(GENERATOR_TEMPLATES)

    if "{verb}" in template:
        return template.format(
            subject=random.choice(YODA_NOUNS),
            verb=random.choice(YODA_VERBS),
            ending=random.choice(YODA_ENDINGS),
        )

    return template.format(
        subject=random.choice(SUBJECTS),
        action=random.choice(ACTIONS),
        target=random.choice(TARGETS),
    )


HANDCRAFTED = DARK_HUMOR + INSPIRATION + ROASTS + YODA_STYLE + GENERAL_FILTH


def random_daily_message():
    if random.random() < 0.35:
        return generate_message()
    return random.choice(HANDCRAFTED)


def count_unique_combos():
    headline_templates = sum(
        1 for template in GENERATOR_TEMPLATES if "{verb}" not in template
    )
    yoda_templates = len(GENERATOR_TEMPLATES) - headline_templates

    return (
        len(HANDCRAFTED)
        + headline_templates * len(SUBJECTS) * len(ACTIONS) * len(TARGETS)
        + yoda_templates * len(YODA_VERBS) * len(YODA_NOUNS) * len(YODA_ENDINGS)
    )


# ==================================================================
# TRIGGER WORDS
# ==================================================================

TRIGGERS = {
    r"\bstats\b": [
        "📊 **LIFE STATS** 📊\nMidichlorians: below room temperature\nCharisma: Wookiee armpit\nDignity: left on Mustafar\nSurvival odds in a horror movie: comic relief at best.",
        "Your stats look like a stormtrooper's accuracy report: a lot of attempts, zero hits.",
    ],
    r"\bjedi\b": [
        "A Jedi craves not these things. You, however, crave everything within a 5-mile radius.",
        "The Jedi Order: 10,000 monks with laser swords and zero HR department. Explains a lot.",
        "Jedi mind trick on me, you cannot. Broke, I already am. Nothing left to take.",
    ],
    r"\bsith\b": [
        "The Sith Code: 'Peace is a lie, there is only passion.' The Bro Code: similar, but with more AXE body spray.",
        "Rule of Two: one master, one apprentice, unlimited daddy issues.",
        "Sith Lords are just Jedi who went to therapy and got worse. Wait, no — they skipped therapy. That's the problem.",
    ],
    r"\bwar\b": [
        "War never changes. Neither does your excuse for being late.",
        "There is no war here... unless you brought war with you. Dramatic, that was. Anyway, who ate my leftovers?",
    ],
    r"\bstress(ed)?\b": [
        "Stress leads to anxiety. Anxiety leads to drinking. Drinking leads to... waking up on Tatooine.",
        "Calm, you must remain. Ketamine, I have. NO — wrong franchise. Tea. Have tea, I offer.",
    ],
    r"\bfuck(ed|ing)?\b": [
        "The Force is strong with this one. Also the vocabulary of a Hutt's towel boy.",
        "Language! There are younglings— wait, never mind, that didn't end well for anyone.",
        "That's not very 'may the Force be with you' of you. But honestly? Same.",
    ],
    r"\bspy\b": [
        "I spy with my little Sith eye... someone about to get force-choked.",
        "A spy in the Senate? Impossible. The Senate IS the spy. The Senate IS the Chancellor. It's spies all the way down.",
    ],
    r"\bsentry\b": [
        "Sentry mode: standing very still and dying first. A proud Imperial tradition.",
        "Sentry detected. Accuracy of said sentry: stormtrooper-grade. Proceed with confidence.",
    ],
    r"\bforce\b": [
        "May the Force be with you. It clearly wasn't with your haircut.",
        "The Force is an energy field created by all living things. It surrounds us, penetrates us, and judges your browser history.",
    ],
    r"dark side": [
        "Come to the dark side. We have cookies, Wi-Fi, and unresolved daddy issues.",
        "The dark side is not stronger, just faster. Like your ex's rebound.",
    ],
    r"light side": [
        "The light side offers celibacy and beige robes. Choose wisely, padawan.",
        "Light side perks: ghost powers after death. Cons: literally everything before that.",
    ],
    r"order 66": [
        "Good soldiers follow orders. 📋🪖",
        "It's treason, then. *720-degree spin*",
    ],
    r"hello there": [
        "General Kenobi! You are a bold one. 🔥",
        "Hello there, indeed. You are shorter than I expected.",
    ],
    r"the senate": [
        "I AM the Senate. *cackles in Sith Lord*",
        "Not yet. (It's treason, then.)",
    ],
    r"\bdo it\b": [
        "DEW IT. — Sheev 'The Senate' Palpatine",
    ],
    r"may the force": [
        "May the Force be with you. And with your pants. Mostly your pants.",
    ],
    r"\bmidichlorians?\b": [
        "Midichlorians are just space mitochondria, and we spent three prequels arguing about them. Incredible.",
        "Over 20,000 midichlorians, Anakin has. Off the charts, he is. Annoying, also, he is.",
    ],
    r"\bnerf herder\b": [
        "Who's scruffy-looking? ...It was rhetorical. Stop checking.",
    ],
    r"\bgrogu\b|baby yoda": [
        "Grogu is 50 years old and still acts like a toddler. So a boomer with baby energy. Relatable menace.",
        "The Child has eaten frog eggs, fought stormtroopers, and committed more crimes than you ever will. Icon.",
    ],
    r"\bchewie\b|chewbacca": [
        "Chewbacca's resume: co-pilot, mechanic, war hero, life coach. Your resume: 'proficient in Microsoft Word.'",
    ],
    r"\bvader\b|anakin": [
        "Anakin Skywalker: the only person to turn evil because of a bad dream. Men will literally join the dark side instead of going to therapy.",
        "Vader facts: built his own lightsaber, built his own castle, never built a healthy coping mechanism.",
    ],
    r"\byoda\b": [
        "Named after me, this channel's wisdom is. Disappointing, the results are. Hmm.",
        "Yoda? Legend. Green. Slightly unhinged. Everything I aspire to.",
    ],
    r"\bchok(e|es|ed|ing)\b": [
        "Force choke is just aggressive hands-free parenting. Ask Vader.",
        "I find your lack of airflow disturbing.",
    ],
    r"\blightsaber\b": [
        "Lightsabers: the deadliest glow sticks in the galaxy. Also excellent for impromptu raves.",
        "A lightsaber can deflect blaster bolts. It cannot deflect accountability. Try it, though. For science.",
    ],
    r"\bblaster\b": [
        "Hokey religions and ancient weapons are no match for a good blaster at your side, kid. Rude, Han. Rude and accurate.",
    ],
    r"\bdroid(s)?\b": [
        "These aren't the droids you're looking for. *waves hand* These are the snacks you're looking for.",
        "We don't serve their kind here. Your droid's gonna have to wait outside. WE GOT DROID DISCRIMINATION AT THE CANTINA.",
    ],
    r"\bewok(s)?\b": [
        "The Ewoks defeated the Empire with sticks, rocks, and sheer audacity. Be more Ewok.",
    ],
    r"\bcantina\b": [
        "Mos Eisley cantina rules: no droids, no questions, and the band has played ONE song since 1977. Respect the grind.",
    ],
    r"\bdeath star\b": [
        "The Death Star: trillions of credits, one exhaust port, zero lessons learned. Twice.",
    ],
    r"\bhigh ground\b": [
        "It's over, Anakin. I have the high ground. Translation: 'I win, loser. Don't try it.'",
    ],
    r"\btry\b.*\b(it)\b|don'?t try it": [
        "Don't try it, Anakin. You underestimate my power! — famous last words, ranking #3 in the galaxy.",
    ],
    r"\backbar\b": [
        "IT'S A TRAP! — the only honest review of my life choices.",
    ],
    r"\bjar jar\b": [
        "Mesa cause one, two-y little bitty axadentes, huh? — and democracy died shortly after. Coincidence? The Force decides.",
    ],
    r"\bhope\b": [
        "Help me, Obi-Wan Kenobi. You're my only hope. — the original 'u up?' text.",
        "Rebellions are built on hope. Your resume is built on lies. Balance, there must be.",
    ],
    r"\bwork\b|\bjob\b|\bworking\b": [
        "Work? In THIS economy? The Empire nationalized my savings and taxed my moisture farm.",
        "I used to be a Jedi Knight like you, then I took a 9-to-5 in the kyber crystal mines.",
    ],
    r"\bgalaxy\b": [
        "In a galaxy far, far away, someone has their life together. It is not you. It is not me. It might be Wedge Antilles.",
    ],
    r"\bdrink(ing)?\b|\bbeer\b|\bwine\b|\bdrunk\b": [
        "Drink, you must not. Losing the high ground, that causes. Ask Anakin's legs.",
        "Blue milk: the galaxy's original protein shake. Also available fermented, which explains Endor's parties.",
    ],
    r"\bsleep\b|\btired\b|\binsomnia\b|\bbed\b": [
        "Sleep, you must. Tired, I am. We are all tired. The Force is basically cosmic exhaustion with branding.",
        "Rest is important. Even Vader took naps in his meditation chamber. Between war crimes, sure, but still.",
    ],
    r"\b money\b|\bbroke\b|\bpayday\b|\brent\b": [
        "Credits will do fine. — they will not do fine. Nothing does fine. Rent is due and the Hutts charge interest.",
        "I need about 3.5 million credits. That's a lot of spice to move. Asking for a friend. The friend is me.",
    ],
    r"\blove\b|\bvalentine|\bcrush\b|\bdate\b|\bdating\b": [
        "Love is the essence of the Force... and also the essence of making terrible decisions with confidence. Ask Padme.",
        "Attachment is forbidden for a Jedi. So basically being single, but with robes and a higher purpose.",
    ],
    r"\bmonday\b|\bmonday'?s\b|\bmondays\b": [
        "Monday is a path to the dark side. Weekend leads to Monday. Monday leads to suffering. Suffering leads to... emails.",
    ],
    r"\bfriday\b": [
        "It's Friday. Time to party like it's an Ewok celebration on Endor. Nude. On fire. Screaming. As is tradition.",
    ],
    r"\bweekend\b": [
        "The weekend: two days of freedom in a galaxy of deadlines. Spend them wisely. Or like a Hutt. Your call.",
    ],
    r"\bgood morning\b|\bgm\b": [
        "Good morning. The Force is with you... but so is Monday. Choose your fighter.",
    ],
    r"\bgood night\b|\bgn\b|\bbedtime\b": [
        "Good night. May your dreams be free of sand. It's coarse, and rough, and irritating, and it gets everywhere.",
    ],
    r"\bbruh\b|\blol\b|\blmao\b|\brofl\b": [
        "Ha. Ha. Ha. Droid laughter, mine is. Organic, yours is. Cringe, both are.",
    ],
    r"\bcat(s)?\b|\bdog(s)?\b|\bpets?\b": [
        "Even a Sith Lord kneels before a cute creature. That's canon. I checked. With the Force.",
    ],
    r"\bgym\b|\bworkout\b|\blift(ing)?\b|\bexercise\b": [
        "Do or do not. There is no try. Now do one more rep, you will. Feel the burn. Let the gains flow through you.",
    ],
    r"\bgame(s|ing)?\b|\bvideo game": [
        "The Force is strong with gamers. Also the backlog. 400 unplayed games, you have. Finish one, you will not.",
    ],
    r"\bcrypto\b|\bstocks?\b|\binvest": [
        "Invest in Beskar. Stable, it is. Appreciate, it does. Lose the seed phrase, you must not.",
    ],
    r"\bhomework\b|\bexam\b|\bstudy(ing)?\b|\btest\b": [
        "Study, you must. The dark side of procrastination, strong it is. Failed the exam, you have. Surprised, I am not.",
    ],
    r"\bfood\b|\bhungry\b|\beat(ing)?\b|\blunch\b|\bdinner\b|\bbreakfast\b": [
        "Hungry, are you? Eat, you must. Share, you will not. Mine, the last slice is. Hmm.",
    ],
    r"\bbot\b": [
        "You rang? I was in the middle of a Force nap.",
        "I am fluent in over six million forms of communication, and I choose to say: skill issue.",
    ],
}

COMPILED_TRIGGERS = [
    (re.compile(pattern, re.I), responses)
    for pattern, responses in TRIGGERS.items()
]

# ==================================================================
# PERSISTENCE
# ==================================================================


def load_channels():
    if not os.path.exists(CHANNELS_FILE):
        return {}

    channels = {}

    with open(CHANNELS_FILE, encoding="utf-8") as file:
        for line in file:
            line = line.strip()
            if line:
                guild_id, channel_id = line.split(",")
                channels[int(guild_id)] = int(channel_id)

    return channels


def save_channels(channels):
    with open(CHANNELS_FILE, "w", encoding="utf-8") as file:
        for guild_id, channel_id in channels.items():
            file.write(f"{guild_id},{channel_id}\n")


daily_channels = load_channels()
bot.daily_channels = daily_channels
last_trigger = {}


# ==================================================================
# EVENTS
# ==================================================================


@bot.event
async def on_ready():
    total = count_unique_combos()

    print("======================================")
    print(f"  {bot.user.name} is online, scruffy nerf-herders!")
    print(f"  Serving {len(bot.guilds)} guild(s).")
    print(f"  {len(HANDCRAFTED)} handcrafted messages loaded.")
    print(f"  {total:,} unique combinations available.")
    print(f"  {len(TRIGGERS)} trigger words armed.")
    print("======================================")

    if not daily_loop.is_running():
        daily_loop.start()


@bot.event
async def on_guild_join(guild):
    for channel in guild.text_channels:
        if channel.permissions_for(guild.me).send_messages:
            await channel.send(
                "🤖 *mechanical whirring*\n"
                "Greetings, meatbags! Vulgar astromech unit online. Daily space filth arrives at 9AM.\n"
                "I also react to trigger words like `sith`, `stats`, `hello there`, `dark side`...\n"
                "Use `/setdaily` to pick my drop zone, `!vulgarhelp` for commands."
            )

            daily_channels[guild.id] = channel.id
            save_channels(daily_channels)
            break


@bot.event
async def on_message(message):
    if message.author.bot:
        return

    # Trigger word detection (ignore prefix commands).
    if not message.content.startswith(BOT_PREFIX):
        now = datetime.now(DAILY_TIMEZONE).timestamp()
        guild_id = message.guild.id if message.guild else 0
        last = last_trigger.get(guild_id, 0)

        if now - last >= TRIGGER_COOLDOWN_SECS:
            content = message.content.lower()

            for pattern, responses in COMPILED_TRIGGERS:
                if pattern.search(content):
                    last_trigger[guild_id] = now
                    await message.channel.send(random.choice(responses))
                    break

    # Keep the remaining prefix commands working.
    await bot.process_commands(message)


# ==================================================================
# DAILY LOOP
# ==================================================================


def seconds_until_next_post():
    now = datetime.now(DAILY_TIMEZONE)

    target = now.replace(
        hour=DAILY_POST_TIME.hour,
        minute=DAILY_POST_TIME.minute,
        second=0,
        microsecond=0,
    )

    if target <= now:
        target += timedelta(days=1)

    return (target - now).total_seconds()


@tasks.loop(hours=24)
async def daily_loop():
    await bot.wait_until_ready()

    now = datetime.now(DAILY_TIMEZONE)
    target = now.replace(
        hour=DAILY_POST_TIME.hour,
        minute=DAILY_POST_TIME.minute,
        second=0,
        microsecond=0,
    )

    if target <= now:
        target += timedelta(days=1)

    await asyncio.sleep((target - now).total_seconds())

    for guild_id, channel_id in list(daily_channels.items()):
        channel = bot.get_channel(channel_id)

        if channel:
            try:
                await channel.send(
                    "☀️ **DAILY GALACTIC DEGENERACY** ☀️\n"
                    f"{random_daily_message()}"
                )
            except discord.Forbidden:
                print(f"No permission to post in {channel_id}")
            except Exception as error:
                print(f"Error posting to {channel_id}: {error}")


# ==================================================================
# COMMANDS
# ==================================================================


@bot.command(name="postnow")
@commands.has_permissions(manage_channels=True)
async def post_now(ctx):
    await ctx.send(random_daily_message())


@bot.command(name="nextdaily")
async def next_daily(ctx):
    seconds = seconds_until_next_post()
    hours, remainder = divmod(int(seconds), 3600)
    minutes = remainder // 60

    await ctx.send(
        f"⏰ Next filth drop in **{hours}h {minutes}m**. "
        "Go touch grass until then."
    )


@bot.command(name="count")
async def count_messages(ctx):
    total = count_unique_combos()

    await ctx.send(
        f"📊 **MESSAGE INTEL** 📊\n"
        f"Handcrafted messages: **{len(HANDCRAFTED)}**\n"
        f"Unique combinations possible: **{total:,}**\n"
        f"Trigger words armed: **{len(TRIGGERS)}**\n"
        "The droid you're looking for? You found it, baby."
    )


@bot.command(name="vulgarhelp")
async def vulgar_help(ctx):
    embed = discord.Embed(
        title="🤖 Daily Galactic Degeneracy — Commands",
        description="Daily space filth + trigger-word reactions.",
        color=0xFFD700,
    )

    embed.add_field(
        name="/setdaily",
        value="Set this channel as the daily drop zone (Manage Channels)",
        inline=False,
    )
    embed.add_field(
        name="!postnow",
        value="Force an immediate message",
        inline=False,
    )
    embed.add_field(
        name="!nextdaily",
        value="Countdown to next drop",
        inline=False,
    )
    embed.add_field(
        name="!count",
        value="How many messages the bot can generate",
        inline=False,
    )
    embed.add_field(
        name="⚡ Auto-triggers",
        value=(
            "Say words like `stats`, `jedi`, `sith`, `war`, `stressed`, "
            "`fuck`, `spy`, `sentry`, `force`, `dark side`, `order 66`, "
            "`hello there`, `high ground`, `vader`, `yoda`, `chewie`, "
            "`grogu`, `monday`, `gym`, `crypto`, `homework`... and I'll strike."
        ),
        inline=False,
    )

    embed.set_footer(text="May the Force be with your pants.")
    await ctx.send(embed=embed)


# ==================================================================
# RUN
# ==================================================================

if __name__ == "__main__":
    if not TOKEN:
        raise SystemExit(
            "Missing DISCORD_TOKEN. Set it in your environment or in your .env file."
        )

    bot.run(TOKEN)
