"""The seven demo scenarios, shared by demo.py, the API and the tests."""

from dataclasses import dataclass, field
from typing import Optional

from engine import Request


@dataclass(frozen=True)
class Scenario:
    number: int
    title: str
    data_tier: int
    requester: str
    jurisdiction: str
    purpose: str
    location_group: str
    area: Optional[str]
    expected: str
    expected_review: bool = False
    why: str = ""

    def request(self) -> Request:
        return Request(self.data_tier, self.requester, self.jurisdiction, self.purpose,
                       self.location_group, area=self.area)

    def attributes(self) -> dict:
        return {
            "data_tier": self.data_tier,
            "requester": self.requester,
            "jurisdiction": self.jurisdiction,
            "purpose": self.purpose,
            "location_group": self.location_group,
            "area": self.area,
        }


SCENARIOS = [
    Scenario(1, "Mecca case: advertiser asks for device level Mecca visits",
             6, "commercial", "saudi_arabia", "advertising", "G1", "Mecca", "Blocked",
             why="LOC_G1, the audience matrix and ADS_NO_RED_LOCATION_TARGETING all block it"),
    Scenario(2, "Tourism ministry asks for Mecca visitor counts by home country",
             2, "government", "saudi_arabia", "tourism", "G1", "Mecca", "Aggregate",
             why="G1 allows counts above k"),
    Scenario(3, "Advertiser asks for visit history at Dubai malls",
             5, "commercial", "uae", "advertising", "G5", "Dubai", "Masked",
             why="Audience matrix gives commercial Masked device logs; hospital rows are dropped"),
    Scenario(4, "Same advertiser request, but in Thailand",
             5, "commercial", "thailand", "advertising", "G5", "Bangkok", "Aggregate", True,
             why="TH_ADID_DEVICE_LEVEL is a grey area, so it goes to Aggregate and review"),
    Scenario(5, "Internal team, cybersecurity, raw data near a defence site",
             7, "internal", "saudi_arabia", "cybersecurity", "G4", "Riyadh", "Aggregate",
             why="G4 caps even internal requests at Aggregate"),
    Scenario(6, "Research partner asks for movement trends in Doha",
             3, "research", "qatar", "tourism", "G5", "Doha", "Aggregate",
             why="Audience matrix gives research Aggregate for behavioral trends"),
    Scenario(7, "Request from a country with no rules yet",
             2, "government", "brazil", "tourism", "G5", "Riyadh", "Blocked",
             why="Unknown jurisdiction fails safe"),
    Scenario(8, "Ad network asks for visitor counts near a reproductive health clinic in New York",
             2, "commercial", "us", "advertising", "G2", "New York", "Blocked",
             why="US_SENSITIVE_GEOFENCE_ADS blocks even counts; ADS_NO_RED_LOCATION_TARGETING agrees"),
    Scenario(9, "University study asks for commuter visit logs in London",
             5, "research", "uk", "tourism", "G5", "London", "Masked",
             why="Audience matrix gives research Masked; place check withholds hospital, union office and school rows"),
    Scenario(10, "Paris tourism office asks for visitor trends at Notre Dame",
             3, "government", "eu", "tourism", "G1", "Paris", "Aggregate",
             why="LOC_G1 allows counts above k for behavioral trends"),
    Scenario(11, "Advertiser asks for device logs near an addiction treatment centre in Paris",
             5, "commercial", "eu", "advertising", "G2", "Paris", "Blocked",
             why="LOC_G2, EU_ART9_DEVICE_LEVEL and ADS_NO_RED_LOCATION_TARGETING all block it"),
    Scenario(12, "Research lab asks for pseudonymous visit logs in Tokyo",
             4, "research", "japan", "tourism", "G5", "Tokyo", "Aggregate", True,
             why="JP_THIRD_PARTY_PROVISION is a grey area, so it goes to Aggregate and review"),
    Scenario(13, "Internal data team pulls raw Tokyo logs for pipeline checks",
             4, "internal", "japan", "cybersecurity", "G5", "Tokyo", "Full",
             why="Internal sees device logs in full; place check still withholds shrine, party office and school rows"),
]
