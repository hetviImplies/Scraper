const axios = require("axios");
const fs = require("fs");

const websites = [
  "http://www.redcrossgym.com/",
  "https://www.five-fitness.in/",
  "https://cfs-gym.grexa.site/",
  "http://gymlounge.in/",
  "http://www.fitcare24.com/",
  "http://www.360fitness.in/",
  "https://fitnesstrend.in/",
  "https://stallon.in/",
  "https://body-n-beauty-health.grexa.site/",
  "https://kartikfitnessgym.com/",
  "http://www.kpfitness.in/",
  "http://kapadiaclubhotel.com/",
  "https://www.planetfitness.com/",
  "https://gymshine.co.in/",
  "https://amphfit.com/",
  "https://www.eklavyagym.in/",
  "http://www.omggimnasio.com/",
  "https://myurls.co/fitoshe",
  "https://fggroup.in/fitnesswithgomzi/weight-loss-programs",
  "http://svhealthclub.com/subpage.aspx?id=1&pid=0",
  "http://slimiphy.com/",
  "https://www.musclehousegymandfitness.com/",
  "http://www.tanishphysioandfitness.com/",
  "https://fggroup.in/fgiit/courses",
  "http://sportena.club/",
  "https://www.saritasagarsankul.org/",
  "https://trevira-physiotherapy-clinic.ueniweb.com/",
  "http://www.apri.in/",
  "https://thebunkerbootcamp.com/",
  "https://www.fitmotivation.in/",
  "http://www.healingwithroshani.com/",
  "http://www.ruhstepup.com/",
  "https://the-metric-gym.grexa.site/",
  "https://kratosclub.com/",
  "https://preschool.littlemillennium.com/little-millennium/preschool-in-surat/preschool-in-Adajan/little-millennium-preschool-in-Adajan-surat--1UVtIO/home",
  "http://www.countryclubindia.net/",
  "http://www.ashiharakarate.org/",
  "https://business.google.com/v/body-battle-fitness/...",
  "https://www.newlifesupplement.com/",
  "https://www.fitnewfine.mydt.in/",
  "http://www.thegreencoat.net/",
  "https://www.cosmicyogawithhetvi.com/",
  "https://www.afton.in/locations?store=58a57dfb0acb519f30b795d4",
  "https://ergoengineers.in/",
  "https://www.yogkulam.com/franchise-VYAK",
  "https://gujkungfufederation.com/",
  "https://www.habitsbyjoel.com/",
  "http://www.arrowfitnessindia.com/",
  "http://www.cbphealth.club/",
  "https://fitmotivation.in/",
  "http://www.suratcitygymkhana.com/",
  "http://www.thedivineshealth.com/",
  "http://www.abhifit.in/",
  "https://blackbunny.co.in/",
  "https://thunderbulll.com/contact-us/",
  "http://ssiym.com/",
  "https://www.jeraifitness.com/",
  "https://www.missionhealth.co.in/",
  "http://sportsphysio.in/",
  "https://boltnutritions.com/",
  "https://sdca.co.in/amenities.php?institution=1",
  "https://sites.google.com/view/samsperformancecoaching/home",
  "http://www.smeerafitness.com/",
  "http://ultimatehealthsolutions.webs.com/",
  "https://socialaddress.ai/bungeefusion",
  "https://www.totalsf.in/",
  "https://aatmanyog.com/",
  "https://www.gymshine.co.in/",
  "http://superprofile.bio/insyncyogaandpilates",
  "https://www.artofliving.org/in-en/centers/surat",
  "http://biofitacademy.com/",
  "http://www.meetphysiotherapyclinics.in/",
  "https://www.yogmitra.in/",
  "https://wa.link/ve4xdh",
  "https://lakhoz.in/",
  "http://reactivephysiohub.com/",
  "https://nutritionistminaz.zest.md/",
  "https://drsanyasyogshala.blogspot.com/",
  "http://shreejiphysio.com/",
  "https://physiojunction.nowfloats.com/",
  "http://athleverse.exlyapp.com/",
  "http://www.cluboneiros.com/",
  "https://radhewellness.com/",
  "http://www.samyakyogp.blogspot.com/",
  "https://x10-fitness-gym.grexa.site/",
  "http://www.italiyaimportexport.co.in/",
  "https://youtube.com/@vlogvssuresh",
  "https://slimiphy.com/",
  "http://www.stallon.in/",
  "https://new-golds-gym-best-gym.grexa.site/",
  "http://www.geloxyfitness.in/",
  "http://www.slimiphy.com/",
  "http://www.9salvogym.com/",
  "https://www.yogiyogacenter.in/",
  "https://thefitnessindia.in/",
  "http://kashthbhanjandevfitness.com/",
  "https://www.metrofitness.co.in/",
  "https://tcpgymin.blogspot.com/2024/11/gym-and-fitness-centre.html?m=1",
  "http://www.five-fitness.in/",
  "http://trivid.graphy.com/",
  "https://www.balancefitnessequipment.com/",
  "https://linktr.ee/fitxcel_nutrition",
  "http://www.pamirsdynamicwarriors.com/",
  "http://www.multiformsports.com/",
  "http://bit.ly/SHD_BusinessSite",
  "http://www.suratmunicipal.gov.in/",
  "http://dolphyfitness.co.in/",
  "https://www.reliancedigitalstores.in/...",
  "http://www.purefitnessmagazine.com/",
  "http://www.heritagehospital.in/",
  "https://stores.vijaysales.com/...",
  "https://www.suratmunicipal.gov.in/Zones/South/SouthZoneA",
  "http://leafaerobics.com/",
  "https://youtube.com/shorts/auvShnLhbcQ?feature=share",
  "http://www.karateshotokan.co.in/",
  "https://www.buyprotein.in/",
  "http://wwwgymcity.com/",
  "https://diliprajaramshahu.goherbalife.com/en-in",
  "http://www.irontemplegym.com/",
  "https://sahyogfitness.com/",
  "https://erapilates.in/",
  "http://fitness.com/",
  "https://tinw.in/taj-gym",
  "http://rockongroup.in/",
  "https://mtfitcoach.goherbalife.com/en-in",
  "http://www.bodystormfitness.com/",
  "https://fitathome.netlify.app/",
  "http://www.syndicategym.com/",
  "https://play.google.com/store/apps/details?id=com.newshapefitnesshub.bellyfatchallenge",
  "https://yogatherealpathoflife.org/",
  "https://www.fitnesstrend.in/",
  "https://www.powermaxfitness.net/",
  "https://www.decathlon.in/store/surat",
  "http://www.khelghar.co.in/",
  "https://fggroup.in/fgiit/fitness-courses",
  "http://www.fitnesstrackgyms.com/",
  "https://s-fitness-gold.vercel.app/",
  "https://www.visionfitness.in/",
  "http://fitnesstrackgyms.com/",
  "https://www.slimiphy.com/"
];

const results = [];

const checkWebsite = async (url) => {
  const start = Date.now();
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: () => true, // Don't throw on any status code
    });
    const elapsed = Date.now() - start;
    const status = response.status === 200 ? "✅ WORKING" : "⚠️ WARNING";
    console.log(`${status} | ${url} | Code: ${response.status} | Time: ${elapsed}ms`);
    results.push({ url, status, code: response.status, responseTime: `${elapsed}ms` });
  } catch (error) {
    const elapsed = Date.now() - start;
    console.log(`❌ DOWN    | ${url} | Error: ${error.code || error.message}`);
    results.push({ url, status: "❌ DOWN", code: error.code || "N/A", responseTime: `${elapsed}ms` });
  }
};

const checkAll = async () => {
  console.log("🔍 Checking websites...\n");
  for (const url of websites) {
    await checkWebsite(url);
  }

  // Save results to JSON
  fs.writeFileSync("results.json", JSON.stringify(results, null, 2));
  console.log("\n✅ Results saved to results.json");
};

checkAll();