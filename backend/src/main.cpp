#include <iostream>
#include <string>
#include <vector>
#include <sstream>
#include "httplib.h"
#include "PuzzleCube.h"
#include "CubeOperations.h"

// Color int -> token string
// C++ face enum: Up=0, Left=1, Front=2, Right=3, Back=4, Down=5
// Color ints assigned at init: face index = color
// So Up=0=W, Left=1=O, Front=2=G, Right=3=R, Back=4=B, Down=5=Y
const std::string INT_TO_TOKEN[] = {"W", "O", "G", "R", "B", "Y"};

int tokenToInt(const std::string& token) {
    if (token == "W") return 0;
    if (token == "O") return 1;
    if (token == "G") return 2;
    if (token == "R") return 3;
    if (token == "B") return 4;
    if (token == "Y") return 5;
    return -1;
}

// API face key order: U, R, F, D, L, B
// C++ face enum:      Up=0, Left=1, Front=2, Right=3, Back=4, Down=5
// Mapping: U->0, R->3, F->2, D->5, L->1, B->4
const std::string API_KEYS[] = {"U", "R", "F", "D", "L", "B"};
const int API_KEY_TO_CPP_FACE[] = {0, 3, 2, 5, 1, 4};

std::vector<std::string> parseJsonStringArray(const std::string& s) {
    std::vector<std::string> result;
    size_t i = 0;
    while (i < s.size()) {
        size_t start = s.find('"', i);
        if (start == std::string::npos) break;
        size_t end = s.find('"', start + 1);
        if (end == std::string::npos) break;
        result.push_back(s.substr(start + 1, end - start - 1));
        i = end + 1;
    }
    return result;
}

std::string extractJsonArray(const std::string& json, const std::string& key) {
    std::string search = "\"" + key + "\"";
    size_t pos = json.find(search);
    if (pos == std::string::npos) return "";
    pos = json.find('[', pos);
    if (pos == std::string::npos) return "";
    size_t end = json.find(']', pos);
    if (end == std::string::npos) return "";
    return json.substr(pos, end - pos + 1);
}

// Parse API state JSON into PuzzleCube
// Looks for a "state" object containing U,R,F,D,L,B arrays
bool apiStateToPuzzleCube(const std::string& json, PuzzleCube& cube) {
    size_t statePos = json.find("\"state\"");
    std::string stateJson = (statePos != std::string::npos)
        ? json.substr(statePos)
        : json;

    auto& cubeData = cube.getStateMutable();

    for (int k = 0; k < 6; k++) {
        std::string field = extractJsonArray(stateJson, API_KEYS[k]);
        if (field.empty()) return false;
        auto tokens = parseJsonStringArray(field);
        if ((int)tokens.size() != 9) return false;

        int f = API_KEY_TO_CPP_FACE[k];
        for (int i = 0; i < 9; i++) {
            int colorInt = tokenToInt(tokens[i]);
            if (colorInt < 0) return false;
            cubeData[f][i / 3][i % 3] = colorInt;
        }
    }
    return true;
}

// Convert PuzzleCube state to API JSON state object
std::string puzzleCubeToApiStateJson(const PuzzleCube& cube) {
    const auto& state = cube.getState();
    std::ostringstream json;
    json << "{";
    for (int k = 0; k < 6; k++) {
        int f = API_KEY_TO_CPP_FACE[k];
        json << "\"" << API_KEYS[k] << "\":[";
        for (int i = 0; i < 9; i++) {
            int colorInt = state[f][i / 3][i % 3];
            json << "\"" << INT_TO_TOKEN[colorInt] << "\"";
            if (i < 8) json << ",";
        }
        json << "]";
        if (k < 5) json << ",";
    }
    json << "}";
    return json.str();
}

int main() {
    httplib::Server svr;
    const int PORT = 4012;

    svr.Options(".*", [](const httplib::Request&, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "content-type");
        res.status = 204;
    });

    auto setCors = [](httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "content-type");
    };

    svr.Get("/health", [&setCors](const httplib::Request&, httplib::Response& res) {
        setCors(res);
        res.set_content("{\"ok\":true}", "application/json");
    });

    svr.Post("/scramble", [&setCors](const httplib::Request&, httplib::Response& res) {
        setCors(res);
        PuzzleCube cube(3);
        CubeOperations::scramble(cube, 25);
        std::string stateJson = puzzleCubeToApiStateJson(cube);
        res.set_content("{\"state\":" + stateJson + "}", "application/json");
    });

    svr.Post("/solve", [&setCors](const httplib::Request& req, httplib::Response& res) {
        setCors(res);
        PuzzleCube cube(3);

        if (!apiStateToPuzzleCube(req.body, cube)) {
            res.status = 400;
            res.set_content("{\"error\":\"Invalid cube state\"}", "application/json");
            return;
        }

        if (cube.isSolved()) {
            res.set_content("{\"solvedState\":null,\"alreadySolved\":true}", "application/json");
            return;
        }

        CubeOperations::solve3x3(cube);
        std::string stateJson = puzzleCubeToApiStateJson(cube);
        res.set_content("{\"solvedState\":" + stateJson + ",\"alreadySolved\":false}", "application/json");
    });

    std::cout << "C++ cube server listening on http://localhost:" << PORT << std::endl;
    svr.listen("0.0.0.0", PORT);
    return 0;
}